import { ITower } from '../interfaces/persistance/tower';
import { lighten } from '../utils/color';
import { Block } from './block';
import { Serializable } from './serializable';
import { hash } from '../utils/hash';
import { IColor } from '../interfaces/color';
import { InnerNode, InnerNodeState } from '../store/inner-node';

export type ColoredBlock = Block & { color: IColor };

export interface TowerState extends ITower, InnerNodeState {}

export class Tower extends Serializable implements ITower, TowerState {
  tags: string[];
  readonly name: string;

  get blocks(): Array<Block> {
    return this.children as Array<Block>;
  }

  coloredBlocks: Array<ColoredBlock>;

  readonly baseColor: IColor;

  constructor(props: ITower) {
    super(props, 'Tower', props.blocks.map(b => new Block(b)));
    this.onAfterClone();
  }

  protected onAfterClone() {
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
    this.addChildren([
      new Block({
        created: new Date(),
        ...props
      })
    ]);
  }

  changeName(name: string) {
    this.changeKeys<TowerState>({ name });
  }
}
