import { IsNotEmpty, IsUUID, IsDateString } from "class-validator";

export class Card {
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @IsNotEmpty()
  title: string;

  @IsDateString()
  due_date: string;

  @IsUUID()
  @IsNotEmpty()
  listId: string;

  @IsNotEmpty()
  userId: string;
}
