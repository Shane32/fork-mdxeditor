import React from 'react'
import { describe, expect, it } from 'vitest'
import { MDXEditor, MDXEditorMethods } from '../'
import { listsPlugin } from '../plugins/lists'
import { quotePlugin } from '../plugins/quote'
import { render } from '@testing-library/react'
import { $getRoot, createEditor, ParagraphNode, TextNode } from 'lexical'
import { $isListItemNode, $isListNode, ListItemNode, ListNode } from '@lexical/list'
import { $isParagraphNode } from 'lexical'
import { QuoteNode } from '@lexical/rich-text'
import { importMarkdownToLexical, type MarkdownParseOptions } from '../importMarkdownToLexical'
import { exportMarkdownFromLexical, type ExportMarkdownFromLexicalOptions } from '../exportMarkdownFromLexical'
import { MdastRootVisitor } from '../plugins/core/MdastRootVisitor'
import { MdastParagraphVisitor } from '../plugins/core/MdastParagraphVisitor'
import { MdastTextVisitor } from '../plugins/core/MdastTextVisitor'
import { MdastBreakVisitor } from '../plugins/core/MdastBreakVisitor'
import { LexicalRootVisitor } from '../plugins/core/LexicalRootVisitor'
import { LexicalParagraphVisitor } from '../plugins/core/LexicalParagraphVisitor'
import { LexicalTextVisitor } from '../plugins/core/LexicalTextVisitor'
import { LexicalLinebreakVisitor } from '../plugins/core/LexicalLinebreakVisitor'
import { MdastBlockQuoteVisitor } from '../plugins/quote/MdastBlockQuoteVisitor'
import { LexicalQuoteVisitor } from '../plugins/quote/LexicalQuoteVisitor'
import { ExtendedListItemNode } from '../plugins/lists/ExtendedListItemNode'
import { MdastListVisitor } from '../plugins/lists/MdastListVisitor'
import { MdastListItemVisitor } from '../plugins/lists/MdastListItemVisitor'
import { LexicalListVisitor } from '../plugins/lists/LexicalListVisitor'
import { LexicalListItemVisitor } from '../plugins/lists/LexicalListItemVisitor'

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

function testIdenticalMarkdown(markdown: string) {
  const ref = React.createRef<MDXEditorMethods>()
  render(<MDXEditor ref={ref} markdown={markdown} />)
  const processedMarkdown = ref.current?.getMarkdown().trim()
  expect(processedMarkdown).toEqual(markdown.trim())
}

function testIdenticalMarkdownWithPlugins(markdown: string, plugins: React.ComponentProps<typeof MDXEditor>['plugins']) {
  const ref = React.createRef<MDXEditorMethods>()
  render(<MDXEditor ref={ref} markdown={markdown} plugins={plugins} />)
  const processedMarkdown = ref.current?.getMarkdown().trim()
  expect(processedMarkdown).toEqual(markdown.trim())
}

describe('markdown import export', () => {
  it('works with an empty string', () => {
    testIdenticalMarkdown('')
  })

  it('works with a simple paragraph', () => {
    testIdenticalMarkdown('Hello World')
  })

  it('works with a line break', () => {
    testIdenticalMarkdown(`Hello\nWorld`)
  })

  it('works with two paragraphs', () => {
    testIdenticalMarkdown(`Hello\n\nWorld`)
  })

  it('works with two whitespaces', () => {
    testIdenticalMarkdown(`Hello\n\nWorld`)
  })

  it('preserves empty lines inside blockquotes across lexical markdown round-trips', () => {
    const mdastVisitors = [
      MdastRootVisitor,
      MdastParagraphVisitor,
      MdastTextVisitor,
      MdastBreakVisitor,
      MdastBlockQuoteVisitor
    ] as unknown as MarkdownParseOptions['visitors']
    const lexicalVisitors = [
      LexicalRootVisitor,
      LexicalParagraphVisitor,
      LexicalTextVisitor,
      LexicalLinebreakVisitor,
      LexicalQuoteVisitor
    ] as unknown as ExportMarkdownFromLexicalOptions['visitors']

    const editor = createEditor({
      namespace: 'test-editor',
      nodes: [ParagraphNode, TextNode, QuoteNode],
      onError(error) {
        throw error
      }
    })

    let exportedMarkdown = ''

    editor.update(() => {
      importMarkdownToLexical({
        root: $getRoot(),
        markdown: `> one
> two
>
> three`,
        visitors: mdastVisitors,
        syntaxExtensions: [],
        mdastExtensions: [],
        jsxComponentDescriptors: [],
        directiveDescriptors: [],
        codeBlockEditorDescriptors: []
      })

      exportedMarkdown = exportMarkdownFromLexical({
        root: $getRoot(),
        visitors: lexicalVisitors,
        toMarkdownExtensions: [],
        toMarkdownOptions: {},
        jsxComponentDescriptors: [],
        jsxIsAvailable: false
      }).trim()
    })

    expect(exportedMarkdown).toEqual(`> one
> two
>
> three`)
  })

  it('works with italics', () => {
    testIdenticalMarkdown(`*Hello* World`)
  })

  it('works with strong', () => {
    testIdenticalMarkdown(`**Hello** World`)
  })

  it('works with underline', () => {
    testIdenticalMarkdown(`<u>Hello</u> World`)
  })

  it('works with underline', () => {
    testIdenticalMarkdown(`a<u>***Hello***</u>a World`)
  })

  it('works with code', () => {
    testIdenticalMarkdown('`Hello` World')
  })
  it('works with code in strong', () => {
    testIdenticalMarkdown('**`Hello` World**')
  })
})

describe('list markdown import export', () => {
  it('supports a simple unordered list', () => {
    testIdenticalMarkdownWithPlugins(`* Item 1\n* Item 2\n* Item 3`, [listsPlugin()])
  })

  it('supports a simple ordered list', () => {
    testIdenticalMarkdownWithPlugins(`1. Item 1\n2. Item 2\n3. Item 3`, [listsPlugin()])
  })

  it('supports nested lists', () => {
    testIdenticalMarkdownWithPlugins(`1. First item\n   1. First item first child\n   2. First item second child\n2. Second item`, [
      listsPlugin()
    ])
  })

  it('preserves a non-spread list item with inline line break', () => {
    testIdenticalMarkdownWithPlugins(`1. First item\n   First item line 2\n2. Second item`, [listsPlugin()])
  })

  it('supports a spread list item with a blockquote', () => {
    testIdenticalMarkdownWithPlugins(`1. First item\n\n   > This is a quote\n\n2. Second item`, [listsPlugin(), quotePlugin()])
  })
})

describe('list item Lexical tree structure', () => {
  /**
   * Build a minimal Lexical editor with the lists plugin visitors registered,
   * import the given markdown, run the callback inside a read() call to inspect
   * the tree, then export back to markdown and return it.
   */
  function withListEditor(
    markdown: string,
    inspect: (root: ReturnType<typeof $getRoot>) => void
  ): string {
    const mdastVisitors = [
      MdastRootVisitor,
      MdastParagraphVisitor,
      MdastTextVisitor,
      MdastBreakVisitor,
      MdastListVisitor,
      MdastListItemVisitor
    ] as unknown as MarkdownParseOptions['visitors']

    const lexicalVisitors = [
      LexicalRootVisitor,
      LexicalParagraphVisitor,
      LexicalTextVisitor,
      LexicalLinebreakVisitor,
      LexicalListVisitor,
      LexicalListItemVisitor
    ] as unknown as ExportMarkdownFromLexicalOptions['visitors']

    const editor = createEditor({
      namespace: 'test-list-editor',
      nodes: [
        ParagraphNode,
        TextNode,
        ExtendedListItemNode,
        {
          replace: ListItemNode,
          with: (node: ListItemNode) => new ExtendedListItemNode(node.__value, node.__checked),
          withKlass: ExtendedListItemNode
        },
        ListNode
      ],
      onError(error) {
        throw error
      }
    })

    let exportedMarkdown = ''

    editor.update(() => {
      importMarkdownToLexical({
        root: $getRoot(),
        markdown,
        visitors: mdastVisitors,
        syntaxExtensions: [],
        mdastExtensions: [],
        jsxComponentDescriptors: [],
        directiveDescriptors: [],
        codeBlockEditorDescriptors: []
      })

      inspect($getRoot())

      exportedMarkdown = exportMarkdownFromLexical({
        root: $getRoot(),
        visitors: lexicalVisitors,
        toMarkdownExtensions: [],
        toMarkdownOptions: { listItemIndent: 'one' },
        jsxComponentDescriptors: [],
        jsxIsAvailable: false
      }).trim()
    })

    return exportedMarkdown
  }

  it('stores a simple list item as ExtendedListItemNode with a ParagraphNode child', () => {
    const exported = withListEditor('* Hello', (root) => {
      const list = root.getFirstChild()
      expect($isListNode(list)).toBe(true)

      const listItem = (list as ListNode).getFirstChild()
      expect(listItem).toBeInstanceOf(ExtendedListItemNode)
      expect($isListItemNode(listItem)).toBe(true) // instanceof check still works

      const para = (listItem as ExtendedListItemNode).getFirstChild()
      expect($isParagraphNode(para)).toBe(true)
      expect(para?.getTextContent()).toBe('Hello')
    })

    expect(exported).toBe('* Hello')
  })

  it('stores a spread list item with two paragraphs as two ParagraphNode children', () => {
    const markdown = '1. First paragraph\n\n   Second paragraph\n\n2. Item two'
    const exported = withListEditor(markdown, (root) => {
      const list = root.getFirstChild()
      expect($isListNode(list)).toBe(true)

      const firstItem = (list as ListNode).getFirstChild() as ExtendedListItemNode
      expect(firstItem).toBeInstanceOf(ExtendedListItemNode)

      const children = firstItem.getChildren()
      // Should have two ParagraphNode children, not one merged paragraph
      expect(children).toHaveLength(2)
      expect($isParagraphNode(children[0])).toBe(true)
      expect($isParagraphNode(children[1])).toBe(true)
      expect(children[0].getTextContent()).toBe('First paragraph')
      expect(children[1].getTextContent()).toBe('Second paragraph')
    })

    expect(exported).toBe(markdown)
  })

  it('stores a nested list as a ListNode child of the parent ExtendedListItemNode', () => {
    const markdown = '1. Parent item\n   1. Child item'
    const exported = withListEditor(markdown, (root) => {
      const outerList = root.getFirstChild() as ListNode
      expect($isListNode(outerList)).toBe(true)

      const parentItem = outerList.getFirstChild() as ExtendedListItemNode
      expect(parentItem).toBeInstanceOf(ExtendedListItemNode)

      const children = parentItem.getChildren()
      // Should have a ParagraphNode and a ListNode as direct children
      expect(children).toHaveLength(2)
      expect($isParagraphNode(children[0])).toBe(true)
      expect(children[0].getTextContent()).toBe('Parent item')
      expect($isListNode(children[1])).toBe(true)

      const innerList = children[1] as ListNode
      const childItem = innerList.getFirstChild() as ExtendedListItemNode
      expect(childItem).toBeInstanceOf(ExtendedListItemNode)
      const childPara = childItem.getFirstChild()
      expect($isParagraphNode(childPara)).toBe(true)
      expect(childPara?.getTextContent()).toBe('Child item')
    })

    expect(exported).toBe(markdown)
  })

  it('Lexical does not rewrite the ExtendedListItemNode structure after import', () => {
    // This test verifies that Lexical's internal normalisation does not collapse
    // the ParagraphNode children back into the list item (which would happen with
    // the stock ListItemNode due to its canMergeWith/append behaviour).
    const markdown = '1. First paragraph\n\n   Second paragraph\n\n2. Item two'

    const mdastVisitors = [
      MdastRootVisitor,
      MdastParagraphVisitor,
      MdastTextVisitor,
      MdastBreakVisitor,
      MdastListVisitor,
      MdastListItemVisitor
    ] as unknown as MarkdownParseOptions['visitors']

    const editor = createEditor({
      namespace: 'test-list-editor-stability',
      nodes: [
        ParagraphNode,
        TextNode,
        ExtendedListItemNode,
        {
          replace: ListItemNode,
          with: (node: ListItemNode) => new ExtendedListItemNode(node.__value, node.__checked),
          withKlass: ExtendedListItemNode
        },
        ListNode
      ],
      onError(error) {
        throw error
      }
    })

    let childCountAfterImport = 0
    let childCountAfterSecondRead = 0

    // First update: import
    editor.update(() => {
      importMarkdownToLexical({
        root: $getRoot(),
        markdown,
        visitors: mdastVisitors,
        syntaxExtensions: [],
        mdastExtensions: [],
        jsxComponentDescriptors: [],
        directiveDescriptors: [],
        codeBlockEditorDescriptors: []
      })

      const list = $getRoot().getFirstChild() as ListNode
      const firstItem = list.getFirstChild() as ExtendedListItemNode
      childCountAfterImport = firstItem.getChildrenSize()
    })

    // Second read: verify structure is unchanged after Lexical's normalisation
    editor.read(() => {
      const list = $getRoot().getFirstChild() as ListNode
      const firstItem = list.getFirstChild() as ExtendedListItemNode
      childCountAfterSecondRead = firstItem.getChildrenSize()
    })

    expect(childCountAfterImport).toBe(2)
    expect(childCountAfterSecondRead).toBe(2)
  })
})
