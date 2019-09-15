import { ITower } from '../interfaces/persistance/tower';
import { lighten } from '../utils/color';
import { Block } from './block';
import { Serializable } from './serializable';
import { hash } from '../utils/hash';
import { IColor } from '../interfaces/color';
import { InnerNodeState } from '../store/inner-node';

export type ColoredBlock = Block & { color: IColor };

export interface TowerState extends ITower, InnerNodeState {
  blocks: Array<Block>;
}

export class Tower extends Serializable implements ITower, TowerState {
  tags: string[];
  readonly name: string;
  coloredBlocks: Array<ColoredBlock>;
  readonly baseColor: IColor;

  constructor(props: ITower) {
    super(props, 'Tower', props.blocks.map(b => new Block(b)));
    this.onAfterClone();
  }

  get blocks(): Array<Block> {
    return this.children as Array<Block>;
  }

  changeKeys(props: Partial<TowerState>): this {
    if (props.hasOwnProperty('blocks')) {
      props.children = props.blocks;
      delete props.blocks;
    }
    return super.changeKeys<TowerState>(props);
  }

  addBlock(props: { tag: string; description: string; isDone: boolean }) {
    this.addChildren([
      new Block({
        created: new Date(),
        ...props
      })
    ]);
  }

  changeName(name: string) {
    this.changeKeys({ name });
  }

  getColorOfBlock(block: Block): IColor {
    return lighten((hash(block.tag) - 0.5) * 50, this.baseColor);
  }

  protected onAfterClone() {
    this.blocks.sort((a, b) => {
      return a.created.getTime() - b.created.getTime();
    });

    this.coloredBlocks = this.blocks.map(b => {
      const coloredBlock = b as ColoredBlock;
      coloredBlock.color = this.getColorOfBlock(b);
      return coloredBlock;
    });

    this.tags = [];
    for (const block of this.blocks) {
      if (!this.tags.includes(block.tag)) {
        this.tags.push(block.tag);
      }
    }
  }
}
