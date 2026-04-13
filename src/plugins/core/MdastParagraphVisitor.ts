import { $createParagraphNode } from 'lexical'
import * as Mdast from 'mdast'
import { MdastImportVisitor } from '../../importMarkdownToLexical'

const lexicalTypesThatShouldSkipParagraphs = ['listitem', 'admonition']

export const MdastParagraphVisitor: MdastImportVisitor<Mdast.Paragraph> = {
  testNode: 'paragraph',
  visitNode: function ({ mdastNode, mdastParent, lexicalParent, actions }): void {
    // markdown inserts paragraphs in lists. lexical does not.
    if (lexicalTypesThatShouldSkipParagraphs.includes(lexicalParent.getType())) {
      // For spread list items (those with blank lines between content blocks), preserve
      // paragraph structure so that each paragraph is represented as a separate ParagraphNode.
      if (lexicalParent.getType() === 'listitem' && (mdastParent as Mdast.ListItem | null)?.spread === true) {
        actions.addAndStepInto($createParagraphNode())
      } else {
        actions.visitChildren(mdastNode, lexicalParent)
      }
    } else {
      actions.addAndStepInto($createParagraphNode())
    }
  }
}
