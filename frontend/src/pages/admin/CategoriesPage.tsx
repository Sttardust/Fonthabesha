import { useTranslation } from 'react-i18next';
import VocabCrudPage from '@/components/admin/VocabCrudPage';
import { adminApi } from '@/lib/api/admin';

export default function CategoriesPage() {
  const { t } = useTranslation();
  return (
    <VocabCrudPage
      title={t('admin.categories.title')}
      i18nPrefix="admin.categories"
      queryKey={['admin-categories']}
      listFn={(page) => adminApi.listCategories(page)}
      createFn={(payload) => adminApi.createCategory(payload)}
      updateFn={(id, payload) => adminApi.updateCategory(id, payload)}
      deleteFn={(id) => adminApi.deleteCategory(id)}
    />
  );
}
