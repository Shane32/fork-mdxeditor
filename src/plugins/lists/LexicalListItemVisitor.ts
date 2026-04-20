import { $isListItemNode, ListItemNode, ListNode } from '@lexical/list'
import * as Mdast from 'mdast'
import { LexicalExportVisitor } from '../../exportMarkdownFromLexical'
import { $isElementNode, $isTextNode, $isDecoratorNode, $isLineBreakNode } from 'lexical'

export const LexicalListItemVisitor: LexicalExportVisitor<ListItemNode, Mdast.ListItem> = {
  testLexicalNode: $isListItemNode,
  visitLexicalNode: ({ lexicalNode, mdastParent, actions }) => {
    const parentList = lexicalNode.getParent()! as ListNode
    const listItem = actions.appendToParent(mdastParent, {
      type: 'listItem' as const,
      checked: parentList.getListType() === 'check' ? Boolean(lexicalNode.getChecked()) : undefined,
      spread: false,
      children: []
    }) as Mdast.ListItem

    // Visit all children of the ListItemNode.
    // - Inline nodes (text, line breaks, inline elements/decorators) are grouped
    //   into a surrounding paragraph for MDAST compatibility.
    // - Block-level nodes (nested lists, paragraphs, code blocks, blockquotes, etc.)
    //   are appended directly to the listItem.
    let surroundingParagraph: Mdast.Paragraph | null = null
    for (const child of lexicalNode.getChildren()) {
      if ($isTextNode(child) || $isLineBreakNode(child) || (child.isInline() && ($isElementNode(child) || $isDecoratorNode(child)))) {
        surroundingParagraph ??= actions.appendToParent(listItem, {
          type: 'paragraph' as const,
          children: []
        }) as Mdast.Paragraph
        actions.visit(child, surroundingParagraph)
      } else {
        surroundingParagraph = null
        actions.visit(child, listItem)
      }
    }

    // A listItem is "spread" (has blank lines between its children in markdown)
    // only when it contains multiple non-list block children. A trailing nested
    // list after a paragraph does not constitute spread on its own.
    const nonListChildren = listItem.children.filter((c) => c.type !== 'list')
    listItem.spread = nonListChildren.length > 1
  }
}
