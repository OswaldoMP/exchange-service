'use strict';

const DEFAULT_EXCHANGE_2026 = {
  id: 1,
  event_title: 'Intercambio 2026',
  date_event: '24 de diciembre 2026',
  time_event: '18:00 hrs',
  money_event: '$500 MXN',
  start_event: '12 de diciembre 2026',
  upload_gift: '10 de diciembre 2026',
  hero_subtitle:
    'Coordina el sorteo de Navidad 2026, comparte ideas de regalos y mantén a tu tribu conectada desde un único espacio.',
  register_subtitle:
    'Diseñamos una experiencia moderna para sumar participantes, registrar ideas de regalos y compartir actualizaciones con banners informativos en cada etapa de la Navidad 2026.',
  dashboard_title: 'Panel del intercambio navideño 2026',
  dashboard_subtitle:
    'Revisa tus ideas de regalo, solicita el sorteo y mantente al tanto del estado de la Navidad 2026.',
  rules_text: 'Incluye enlaces o tiendas para cada idea de regalo.',
  reminder_text: 'Comparte mínimo tres opciones para inspirar a tu amigo secreto.',
  draw_banner_note: 'Para recibir el resultado del sorteo navideño.',
  exchange_banner_note: 'Para dar y recibir regalo de tu amigo secreto.',
  email_placeholder: 'navidad2026@tuempresa.com',
  gift_name_placeholder: 'Ej. Audífonos inalámbricos, taza navideña...',
  gift_store_placeholder: 'Ej. Amazon, Liverpool, Mercado Libre...',
  gift_link_placeholder: 'https://tienda.com/mi-regalo-2026',
  email_notifications_enabled: false,
};

const CONFIGURABLE_EXCHANGE_FIELDS = [
  'event_title',
  'date_event',
  'time_event',
  'money_event',
  'start_event',
  'upload_gift',
  'hero_subtitle',
  'register_subtitle',
  'dashboard_title',
  'dashboard_subtitle',
  'rules_text',
  'reminder_text',
  'draw_banner_note',
  'exchange_banner_note',
  'email_placeholder',
  'gift_name_placeholder',
  'gift_store_placeholder',
  'gift_link_placeholder',
];

const VALID_ROLES = new Set(['admin', 'participant']);
const SESSION_TTL_DAYS = 30;
const CONFIRMATION_TTL_HOURS = 24;

module.exports = {
  DEFAULT_EXCHANGE_2026,
  CONFIGURABLE_EXCHANGE_FIELDS,
  VALID_ROLES,
  SESSION_TTL_DAYS,
  CONFIRMATION_TTL_HOURS,
};
