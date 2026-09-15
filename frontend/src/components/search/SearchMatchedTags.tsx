import {
  getMatchedSearchTags,
  getSearchHighlightParts,
  type SearchDocument,
} from '@/lib/search';

type SearchMatchedTagsProps = {
  document: SearchDocument;
  query: string;
  className?: string;
};

/**
 * The hashtags a hit was found by, so a result without the query in its title
 * still shows why it is there.
 */
export default function SearchMatchedTags({
  document,
  query,
  className = '',
}: SearchMatchedTagsProps) {
  const tags = getMatchedSearchTags(document, query);
  if (tags.length === 0) return null;

  return (
    <span className={`flex min-w-0 gap-x-2 gap-y-1 text-[#0b5a45] ${className}`}>
      {tags.map((tag) => (
        <span key={tag}>
          #
          {getSearchHighlightParts(tag, query).map((part, index) =>
            part.matched ? (
              <mark key={index} className="bg-transparent font-semibold text-inherit">
                {part.text}
              </mark>
            ) : (
              <span key={index}>{part.text}</span>
            ),
          )}
        </span>
      ))}
    </span>
  );
}
