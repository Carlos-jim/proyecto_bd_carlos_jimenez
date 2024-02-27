import { IsNotEmpty, IsDefined, IsString, IsUUID, Length  } from "class-validator";

export class List {
  @IsNotEmpty()
  @IsString()
  @IsDefined()
  @Length(5, 30)
  name: string;

  
  @IsDefined()
  @IsUUID()
  boardId: string;
}
