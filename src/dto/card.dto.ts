import { IsNotEmpty,IsDefined ,Length, IsUUID, IsOptional, IsString } from "class-validator";

export class Card {
  @Length(5, 50)
  @IsDefined()
  title: string;

  @IsDefined()
  @Length(0, 255)
  description: string;

  @IsOptional()
  @IsString()
  due_date?: string;

  @IsUUID()
  @IsNotEmpty()
  listId: string;

}
