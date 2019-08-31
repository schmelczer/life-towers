import { ITower } from '../interfaces/persistance/tower';
import { lighten } from '../utils/color';
import { Block } from './block';
import { Serializable } from './serializable';
import { hash } from '../utils/hash';
import { Node } from '../storage/node';
import { IColor } from '../interfaces/persistance/color';

export class Tower extends Serializable implements ITower {
  constructor(parent: Node, props: ITower) {
    super(parent, props);

    this.blocks.sort((a, b) => a.created.getTime() - b.created.getTime());
    this.calculateTagList();
  }

  tags: string[];

  // Only here to prevent ts warnings.
  name: string;
  type: 'Tower';
  get blocks(): Array<Block> {
    return this.children as Array<Block>;
  }
  baseColor: IColor;

  get coloredBlocks(): Array<Block & { color: IColor }> {
    return this.children.map(b => {
      const coloredBlock = b as Block & { color: IColor };
      coloredBlock.color = lighten((hash(coloredBlock.tag) - 0.5) * 50, this.baseColor);
      return coloredBlock;
    });
  }

  addBlock(props: { tag: string; description: string; isDone: boolean }) {
    new Block(this, {
      created: new Date(),
      ...props,
      type: 'Block'
    });
  }

  private calculateTagList() {
    this.tags = [];
    for (const block of this.blocks) {
      if (!this.tags.includes(block.tag)) {
        this.tags.push(block.tag);
      }
    }
  }
}
