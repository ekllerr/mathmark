declare module 'dom-to-image-more' {
  interface Options {
    width?: number
    height?: number
    style?: Partial<CSSStyleDeclaration>
    bgcolor?: string
    quality?: number
  }

  function toPng(node: HTMLElement, options?: Options): Promise<string>
  function toJpeg(node: HTMLElement, options?: Options): Promise<string>
  function toBlob(node: HTMLElement, options?: Options): Promise<Blob>
  export default { toPng, toJpeg, toBlob }
}
