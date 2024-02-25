import { IsNotEmpty, IsUUID } from "class-validator";

export class Card {
  @IsNotEmpty()
  name: string;

  @IsUUID()
  userId: string;
}
