import { IsNotEmpty,IsDefined ,Length, IsUUID, IsDateString } from "class-validator";

export class Card {
  @Length(5, 50)
  @IsDefined()
  title: string;

  @IsDefined()
  @Length(0, 255)
  description: string;

  @IsDefined()
  @IsDateString()
  due_date: string;

  @IsUUID()
  @IsNotEmpty()
  listId: string;

}
