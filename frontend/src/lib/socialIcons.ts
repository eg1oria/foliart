import type { IconType } from 'react-icons';
import {
  SiFacebook,
  SiInstagram,
  SiOdnoklassniki,
  SiPinterest,
  SiTelegram,
  SiTiktok,
  SiViber,
  SiVk,
  SiWhatsapp,
  SiX,
  SiYoutube,
} from 'react-icons/si';

import type { SocialIconKey } from './socialLinks';

/**
 * Every icon a badge can carry, named statically so the bundler keeps seeing
 * which ones are reachable — the stored key is data, the component is not.
 */
export const socialIcons: Record<SocialIconKey, IconType> = {
  vk: SiVk,
  ok: SiOdnoklassniki,
  facebook: SiFacebook,
  telegram: SiTelegram,
  instagram: SiInstagram,
  youtube: SiYoutube,
  whatsapp: SiWhatsapp,
  tiktok: SiTiktok,
  viber: SiViber,
  pinterest: SiPinterest,
  x: SiX,
};
