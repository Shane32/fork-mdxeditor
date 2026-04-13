import { $applyNodeReplacement, ElementNode, LexicalNode, NodeKey, SerializedElementNode, Spread } from 'lexical'

/**
 * A serialized representation of a {@link ListItemSpreadParagraphNode}.
 * @internal
 */
export type SerializedListItemSpreadParagraphNode = Spread<
  {
    type: 'list-item-spread-paragraph'
    version: 1
  },
  SerializedElementNode
>

/**
 * A Lexical node that represents a paragraph within a "spread" list item (a list item
 * that contains multiple paragraphs separated by blank lines in markdown).
 * Extends ElementNode (not ParagraphNode) so that ListItemNode does not merge it.
 * @internal
 */
export class ListItemSpreadParagraphNode extends ElementNode {
  static getType(): string {
    return 'list-item-spread-paragraph'
  }

  static clone(node: ListItemSpreadParagraphNode): ListItemSpreadParagraphNode {
    return new ListItemSpreadParagraphNode(node.__key)
  }

  static importJSON(serializedNode: SerializedListItemSpreadParagraphNode): ListItemSpreadParagraphNode {
    return $createListItemSpreadParagraphNode().updateFromJSON(serializedNode)
  }

  constructor(key?: NodeKey) {
    super(key)
  }

  exportJSON(): SerializedListItemSpreadParagraphNode {
    return {
      ...super.exportJSON(),
      type: 'list-item-spread-paragraph',
      version: 1
    }
  }

  createDOM(): HTMLElement {
    return document.createElement('p')
  }

  updateDOM(): boolean {
    return false
  }
}

/** @internal */
export function $createListItemSpreadParagraphNode(): ListItemSpreadParagraphNode {
  return $applyNodeReplacement(new ListItemSpreadParagraphNode())
}

/** @internal */
export function $isListItemSpreadParagraphNode(node: LexicalNode | null | undefined): node is ListItemSpreadParagraphNode {
  return node instanceof ListItemSpreadParagraphNode
}
