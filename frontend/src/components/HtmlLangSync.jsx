import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

// No renderiza nada visible: solo mantiene <html lang="..."> sincronizado
// con el idioma activo, para lectores de pantalla y SEO.
export default function HtmlLangSync() {
  const { i18n } = useTranslation();

  useEffect(() => {
    document.documentElement.lang = i18n.resolvedLanguage;
  }, [i18n.resolvedLanguage]);

  return null;
}
