import type { IconType } from 'react-icons';
import { SiOdnoklassniki, SiVk } from 'react-icons/si';

type SocialLink = {
  id: string;
  label: string;
  href: string;
  icon?: IconType;
  text?: string;
};

const socialLinks: SocialLink[] = [
  {
    id: 'dzen',
    label: 'Dzen',
    href: 'https://dzen.ru/foliart',
    text: 'DZ',
  },
  {
    id: 'vk',
    label: 'VK',
    href: 'https://vk.com/foliart',
    icon: SiVk,
  },
  {
    id: 'ok',
    label: 'OK',
    href: 'https://ok.ru/group/70000047721968',
    icon: SiOdnoklassniki,
  },
  {
    id: 'max',
    label: 'MAX',
    href: 'https://max.ru/id2309181772_biz',
    text: 'MAX',
  },
];

type SocialLinksProps = {
  ariaLabel?: string;
  className?: string;
  linkClassName?: string;
  onLinkClick?: () => void;
};

const defaultNavClassName = 'flex items-center gap-2';
const defaultLinkClassName =
  'flex h-12 w-12 items-center justify-center rounded-full border border-white/25 text-white transition-colors hover:border-transparent hover:bg-[#074031] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

export default function SocialLinks({
  ariaLabel = 'Foliart social links',
  className = defaultNavClassName,
  linkClassName = defaultLinkClassName,
  onLinkClick,
}: SocialLinksProps) {
  return (
    <nav aria-label={ariaLabel} className={className}>
      {socialLinks.map(({ id, label, href, icon: Icon, text }) => (
        <a
          key={id}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Foliart ${label}`}
          title={label}
          onClick={onLinkClick}
          className={linkClassName}>
          {Icon ? (
            <Icon size={20} aria-hidden="true" />
          ) : (
            <span aria-hidden="true" className="text-[14px] font-bold uppercase leading-none">
              {text}
            </span>
          )}
        </a>
      ))}
    </nav>
  );
}
