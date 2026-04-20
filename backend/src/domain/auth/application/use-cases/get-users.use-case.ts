import { Injectable } from "@nestjs/common";
import { Either, right } from "@/core/either";
import { UsersRepository, UserRecord } from "../repositories/users.repository";

@Injectable()
export class GetUsersUseCase {
  constructor(private readonly repo: UsersRepository) {}

  async execute(input: {
    requesterId: string;
    requesterRole: string;
  }): Promise<Either<Error, UserRecord[]>> {
    if (input.requesterRole === "admin") {
      const users = await this.repo.findAll();
      return right(users);
    }
    const self = await this.repo.findById(input.requesterId);
    return right(self ? [self] : []);
  }
}
