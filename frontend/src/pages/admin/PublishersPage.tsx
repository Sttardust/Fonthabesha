import { useTranslation } from 'react-i18next';
import VocabCrudPage from '@/components/admin/VocabCrudPage';
import { adminApi } from '@/lib/api/admin';

export default function PublishersPage() {
  const { t } = useTranslation();
  return (
    <VocabCrudPage
      title={t('admin.publishers.title')}
      i18nPrefix="admin.publishers"
      queryKey={['admin-publishers']}
      listFn={(page) => adminApi.listPublishers(page)}
      createFn={(payload) => adminApi.createPublisher(payload)}
      updateFn={(id, payload) => adminApi.updatePublisher(id, payload)}
      deleteFn={(id) => adminApi.deletePublisher(id)}
    />
  );
}
