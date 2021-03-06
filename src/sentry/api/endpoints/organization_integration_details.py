from __future__ import absolute_import

from uuid import uuid4

import six
from django.http import Http404

from sentry.api.bases.organization import OrganizationEndpoint, OrganizationIntegrationsPermission
from sentry.api.serializers import serialize
from sentry.shared_integrations.exceptions import IntegrationError
from sentry.models import AuditLogEntryEvent, Integration, ObjectStatus, OrganizationIntegration
from sentry.tasks.deletion import delete_organization_integration
from sentry.utils.audit import create_audit_entry


class OrganizationIntegrationDetailsEndpoint(OrganizationEndpoint):
    permission_classes = (OrganizationIntegrationsPermission,)

    def get(self, request, organization, integration_id):
        try:
            integration = OrganizationIntegration.objects.get(
                integration_id=integration_id, organization=organization
            )
        except OrganizationIntegration.DoesNotExist:
            raise Http404

        return self.respond(serialize(integration, request.user))

    def delete(self, request, organization, integration_id):
        # Removing the integration removes the organization
        # integrations and all linked issues.
        try:
            org_integration = OrganizationIntegration.objects.get(
                integration_id=integration_id, organization=organization
            )
        except OrganizationIntegration.DoesNotExist:
            raise Http404

        updated = OrganizationIntegration.objects.filter(
            id=org_integration.id, status=ObjectStatus.VISIBLE
        ).update(status=ObjectStatus.PENDING_DELETION)

        if updated:
            delete_organization_integration.apply_async(
                kwargs={
                    "object_id": org_integration.id,
                    "transaction_id": uuid4().hex,
                    "actor_id": request.user.id,
                },
                countdown=0,
            )
            integration = org_integration.integration
            create_audit_entry(
                request=request,
                organization=organization,
                target_object=integration.id,
                event=AuditLogEntryEvent.INTEGRATION_REMOVE,
                data={"provider": integration.provider, "name": integration.name},
            )

        return self.respond(status=204)

    def post(self, request, organization, integration_id):
        try:
            integration = Integration.objects.get(id=integration_id, organizations=organization)
        except Integration.DoesNotExist:
            raise Http404

        installation = integration.get_installation(organization.id)
        try:
            installation.update_organization_config(request.data)
        except IntegrationError as e:
            return self.respond({"detail": six.text_type(e)}, status=400)

        return self.respond(status=200)
