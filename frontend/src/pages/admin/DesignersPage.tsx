import { useTranslation } from 'react-i18next';
import VocabCrudPage from '@/components/admin/VocabCrudPage';
import { adminApi } from '@/lib/api/admin';

export default function DesignersPage() {
  const { t } = useTranslation();
  return (
    <VocabCrudPage
      title={t('admin.designers.title')}
      i18nPrefix="admin.designers"
      queryKey={['admin-designers']}
      listFn={(page) => adminApi.listDesigners(page)}
      createFn={(payload) => adminApi.createDesigner(payload)}
      updateFn={(id, payload) => adminApi.updateDesigner(id, payload)}
      deleteFn={(id) => adminApi.deleteDesigner(id)}
    />
  );
}
