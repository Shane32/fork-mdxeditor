import { $isListNode, ListNode } from '@lexical/list'
import * as Mdast from 'mdast'
import { LexicalExportVisitor } from '../../exportMarkdownFromLexical'

export const LexicalListVisitor: LexicalExportVisitor<ListNode, Mdast.List> = {
  testLexicalNode: $isListNode,
  visitLexicalNode: ({ lexicalNode, mdastParent, actions }) => {
    const list = actions.appendToParent(mdastParent, {
      type: 'list' as const,
      ordered: lexicalNode.getListType() === 'number',
      spread: false,
      children: []
    }) as Mdast.List
    actions.visitChildren(lexicalNode, list)
    list.spread = list.children.some((child) => (child as Mdast.ListItem).spread === true)
  }
}
