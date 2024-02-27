import { IsDefined, IsBoolean, IsUUID } from "class-validator";

export class CardUser {
  @IsUUID()
  @IsDefined()
  cardId: string;

  @IsUUID()
  @IsDefined()
  userId: string;

  @IsDefined()
  @IsBoolean()
  isOwner: boolean;
}
