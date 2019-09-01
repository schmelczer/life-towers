import { ITower } from '../interfaces/persistance/tower';
import { lighten } from '../utils/color';
import { Block } from './block';
import { Serializable } from './serializable';
import { hash } from '../utils/hash';
import { Node } from '../store/node';
import { IColor } from '../interfaces/color';

export type ColoredBlock = Block & { color: IColor };

export class Tower extends Serializable implements ITower {
  protected type = 'Tower';

  tags: string[];
  name: string;

  get blocks(): Array<Block> {
    return this.children as Array<Block>;
  }

  coloredBlocks: Array<ColoredBlock>;

  readonly baseColor: IColor;

  constructor(parent: Node, props: ITower) {
    super(parent, props, 'Tower');
    this.onAfterClone();
  }

  protected onAfterClone(): void {
    this.blocks.sort((a, b) => {
      return a.created.getTime() - b.created.getTime();
    });

    this.coloredBlocks = this.blocks.map(b => {
      const coloredBlock = b as ColoredBlock;
      coloredBlock.color = lighten((hash(coloredBlock.tag) - 0.5) * 50, this.baseColor);
      return coloredBlock;
    });

    this.tags = [];
    for (const block of this.blocks) {
      if (!this.tags.includes(block.tag)) {
        this.tags.push(block.tag);
      }
    }
  }

  addBlock(props: { tag: string; description: string; isDone: boolean }) {
    new Block(this, {
      created: new Date(),
      ...props
    });
  }

  changeName(newName: string) {
    // For optimization purposes.
    this.name = newName;
    this.mutatedUpdate();
  }
}
