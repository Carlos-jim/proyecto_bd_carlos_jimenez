import { IsNotEmpty, IsNumber } from "class-validator";

export class Card {
  @IsNotEmpty()
  name: string;

  @IsNumber()
  userId: number;
}
