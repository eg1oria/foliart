import { slugifyPublicName } from '../public-slug.util';

export function slugifyArticleTitle(value: string) {
  return slugifyPublicName(value, 'article');
}
