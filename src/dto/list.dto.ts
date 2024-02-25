import { IsNotEmpty, IsInt } from "class-validator";
import { Expose, Type } from "class-transformer";

export class List {
  @Expose()
  @IsNotEmpty()
  name: string;

  @Expose()
  @Type(() => Number)
  @IsInt()
  boardId: number;
}
