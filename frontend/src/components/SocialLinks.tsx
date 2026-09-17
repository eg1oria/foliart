import { socialIcons } from '@/lib/socialIcons';
import type { SocialLinkItem } from '@/lib/socialLinks';

type SocialLinksProps = {
  links: SocialLinkItem[];
  ariaLabel?: string;
  className?: string;
  linkClassName?: string;
  onLinkClick?: () => void;
};

const defaultNavClassName = 'flex items-center gap-2';
const defaultLinkClassName =
  'flex h-12 w-12 items-center justify-center rounded-full border border-white/25 text-white transition-colors hover:border-transparent hover:bg-[#074031] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

export default function SocialLinks({
  links,
  ariaLabel = 'Foliart social links',
  className = defaultNavClassName,
  linkClassName = defaultLinkClassName,
  onLinkClick,
}: SocialLinksProps) {
  if (links.length === 0) {
    return null;
  }

  return (
    <nav aria-label={ariaLabel} className={className}>
      {links.map(({ id, label, href, icon, text }) => {
        const Icon = icon ? socialIcons[icon] : undefined;

        return (
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
        );
      })}
    </nav>
  );
}
