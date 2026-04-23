declare module 'sanitize-html' {
  export type TransformTagResult = {
    attribs?: Record<string, string>;
    tagName: string;
    text?: string;
  };

  export type TransformTag =
    | string
    | ((
        tagName: string,
        attribs: Record<string, string>,
      ) => TransformTagResult);

  export interface IFrame {
    attribs: Record<string, string>;
    tag: string;
    text?: string;
  }

  export interface IOptions {
    allowedAttributes?: Record<string, string[]>;
    allowedSchemes?: string[];
    allowedTags?: string[];
    exclusiveFilter?: (frame: IFrame) => boolean;
    transformTags?: Record<string, TransformTag>;
  }

  export default function sanitizeHtml(
    input: string,
    options?: IOptions,
  ): string;
}
