import { ITower } from '../interfaces/persistance/tower';
import { Color } from './color';
import { Block } from './block';
import { Base } from './base';
import { IBlock } from '../interfaces/persistance/block';
import { hash } from '../utils/hash';

export class Tower extends Base implements ITower {
  constructor(props: ITower) {
    super(props);

    // @ts-ignore to prevent update message
    this.__baseColor = new Color(this.baseColor);

    this.blocks = this.blocks.map(b => this.createBlock(b));
    this.blocks.sort((a, b) => a.created.getTime() - b.created.getTime());
  }

  tags: string[];

  // Only here to prevent ts warnings.
  name: string;
  blocks: Block[];
  baseColor: Color;

  addBlock(props: { tag: string; description: string; isDone: boolean }) {
    this.blocks.push(
      this.createBlock({
        created: new Date(),
        ...props
      })
    );

    this.update();
  }

  private createBlock(props: IBlock): Block {
    const block = new Block(props);
    block.subscribe(() => this.update());
    return block;
  }

  protected update() {
    this.tags = [];
    for (const block of this.blocks) {
      if (!this.tags.includes(block.tag)) {
        this.tags.push(block.tag);
      }
      block.color = this.baseColor.lighten(hash(block.tag) * 50);
    }

    super.update();
  }
}
