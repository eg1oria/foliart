import {
  applyArticleImageLayout,
  createArticleImageLayout,
} from './article-image-layout';

const mediaId = 'd87ed781-53f8-4a20-90f3-927c75ef7842';
const image = {
  type: 'image',
  attrs: {
    mediaId,
    src: `/media/articles/media/${mediaId}/original.webp`,
    alt: 'Leaf',
  },
};

describe('shared article image layout', () => {
  it('places an image at the equivalent relative position in every locale', () => {
    const source = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'One' }] },
        image,
        { type: 'paragraph', content: [{ type: 'text', text: 'Two' }] },
      ],
    };
    const translation = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Uno' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Dos' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Tres' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Cuatro' }] },
      ],
    };
    const merged = applyArticleImageLayout(
      translation,
      createArticleImageLayout([source]),
    );
    expect(merged.content?.map((node) => node.type)).toEqual([
      'paragraph',
      'paragraph',
      'image',
      'paragraph',
      'paragraph',
    ]);
  });

  it('unifies distinct images found in different languages', () => {
    const secondId = 'a39223a8-a2ac-41cf-a342-aba7fef1701e';
    const first = { type: 'doc', content: [image] };
    const second = {
      type: 'doc',
      content: [
        {
          type: 'image',
          attrs: {
            mediaId: secondId,
            src: `/media/articles/media/${secondId}/original.webp`,
          },
        },
      ],
    };
    expect(createArticleImageLayout([first, second]).placements).toHaveLength(
      2,
    );
  });

  it('keeps upload placeholders while applying the shared layout', () => {
    const document = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'First' }] },
        {
          type: 'imageUpload',
          attrs: {
            uploadId: '671e1d3a-20bf-471d-a7ea-ec656def65cb',
            alt: 'Photo',
          },
        },
        { type: 'paragraph', content: [{ type: 'text', text: 'Second' }] },
      ],
    };
    const merged = applyArticleImageLayout(
      document,
      createArticleImageLayout([{ type: 'doc', content: [image] }]),
      { allowPendingUploads: true },
    );

    expect(merged.content?.some((node) => node.type === 'imageUpload')).toBe(
      true,
    );
    expect(merged.content?.some((node) => node.type === 'image')).toBe(true);
  });
});
