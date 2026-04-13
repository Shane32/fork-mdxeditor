import * as Mdast from 'mdast'
import { LexicalExportVisitor } from '../../exportMarkdownFromLexical'
import { $isListItemSpreadParagraphNode, ListItemSpreadParagraphNode } from './ListItemSpreadParagraphNode'

export const LexicalListItemSpreadParagraphVisitor: LexicalExportVisitor<ListItemSpreadParagraphNode, Mdast.Paragraph> = {
  testLexicalNode: $isListItemSpreadParagraphNode,
  visitLexicalNode: ({ actions }) => {
    actions.addAndStepInto('paragraph')
  }
}
