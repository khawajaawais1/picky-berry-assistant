import { Link } from 'expo-router';

import { AppText } from '@/components/atoms';
import { Screen } from '@/components/templates';
import { useTranslation } from '@/services/i18n';

export default function NotFoundScreen() {
  const { t } = useTranslation();

  return (
    <Screen scroll={false} subtitle={t('app.notFound.subtitle')} title={t('app.notFound.title')}>
      <AppText variant="body" tone="accent">
        <Link href="/">{t('app.notFound.action')}</Link>
      </AppText>
    </Screen>
  );
}
