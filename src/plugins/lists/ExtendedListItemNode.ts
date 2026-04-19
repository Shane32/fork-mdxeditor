import { ElementNode, LexicalNode, Spread } from 'lexical'
import { $isListItemNode, ListItemNode, SerializedListItemNode } from '@lexical/list'

export type SerializedExtendedListItemNode = Spread<
  {
    type: 'extended-listitem'
  },
  SerializedListItemNode
>

/**
 * A replacement for {@link ListItemNode} that allows block-level children
 * (paragraphs, nested lists, code blocks, blockquotes, etc.) to coexist inside
 * a single list item without being auto-merged.
 *
 * The stock ListItemNode.append() automatically "merges" any ParagraphNode it
 * receives by stripping the paragraph wrapper and pulling its inline children
 * directly into the list item. This subclass bypasses that behaviour by calling
 * ElementNode.prototype.append directly, so ParagraphNodes (and other block
 * nodes) are stored as genuine children of the list item.
 *
 * Registered as a replacement for ListItemNode via LexicalNodeReplacement so
 * that $isListItemNode() (which uses instanceof) continues to work correctly.
 *
 * @group Lists
 */
export class ExtendedListItemNode extends ListItemNode {
  static getType(): string {
    return 'extended-listitem'
  }

  static clone(node: ExtendedListItemNode): ExtendedListItemNode {
    return new ExtendedListItemNode(node.__value, node.__checked, node.__key)
  }

  /**
   * Override: do NOT auto-merge ParagraphNodes into the list item.
   * Calls ElementNode.prototype.append directly, bypassing ListItemNode's
   * merge logic entirely.
   */
  append(...nodes: LexicalNode[]): this {
    return ElementNode.prototype.append.call(this, ...nodes) as this
  }

  /**
   * Override: never merge ParagraphNodes into this node.
   * Only allow merging with other list items (needed for indent/outdent).
   */
  canMergeWith(node: LexicalNode): boolean {
    return $isListItemNode(node)
  }

  static importJSON(serializedNode: SerializedListItemNode): ExtendedListItemNode {
    const node = new ExtendedListItemNode(serializedNode.value, serializedNode.checked)
    node.setFormat(serializedNode.format)
    node.setIndent(serializedNode.indent)
    node.setDirection(serializedNode.direction)
    return node
  }

  exportJSON(): SerializedExtendedListItemNode {
    return {
      ...super.exportJSON(),
      type: 'extended-listitem'
    }
  }
}

export function $createExtendedListItemNode(checked?: boolean): ExtendedListItemNode {
  return new ExtendedListItemNode(1, checked)
}

export function $isExtendedListItemNode(node: LexicalNode | null | undefined): node is ExtendedListItemNode {
  return node instanceof ExtendedListItemNode
}
