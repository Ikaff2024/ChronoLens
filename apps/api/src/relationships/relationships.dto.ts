import { RelationshipType } from "@prisma/client";
import { Type } from "class-transformer";
import { IsDate, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";

export class CreateRelationshipDto {
  @IsUUID()
  investigationId!: string;

  @IsUUID()
  sourceEntityId!: string;

  @IsUUID()
  targetEntityId!: string;

  @IsEnum(RelationshipType)
  type!: RelationshipType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  weight?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;

  @Type(() => Date)
  @IsDate()
  validFrom!: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  validTo?: Date;
}
