// import { Injectable } from '@nestjs/common';
// import { InjectModel } from '@nestjs/mongoose';
// import { Model } from 'mongoose';
// import { IPizzaRepository } from './pizza.repository.interface';

// @Injectable()
// export class MongoPizzaRepository implements IPizzaRepository {
//   constructor(
//     @InjectModel('Pizza') private readonly pizzaModel: Model<any>,
//     @InjectModel('Ingredient') private readonly ingredientModel: Model<any>,
//   ) {}

//   async findAllWithPagination({
//     page = 1,
//     limit = 10,
//   }: {
//     page?: number;
//     limit?: number;
//   }) {
//     const skip = (page - 1) * limit;
//     const query = { deletedAt: null, isActive: true };

//     const [data, total] = await Promise.all([
//       this.pizzaModel
//         .find(query)
//         .skip(skip)
//         .limit(limit)
//         .populate('ingredients')
//         .exec(),
//       this.pizzaModel.countDocuments(query).exec(),
//     ]);

//     return {
//       data,
//       meta: {
//         total,
//         page,
//         limit,
//         totalPages: Math.ceil(total / limit),
//       },
//     };
//   }

//   findById(id: string) {
//     return this.pizzaModel
//       .findOne({ _id: id, deletedAt: null })
//       .populate('ingredients')
//       .exec();
//   }

//   create(data: any) {
//     const newPizza = new this.pizzaModel(data);
//     return newPizza.save();
//   }

//   softDelete(id: string) {
//     return this.pizzaModel
//       .findByIdAndUpdate(
//         id,
//         { deletedAt: new Date(), isActive: false },
//         { new: true },
//       )
//       .exec();
//   }

//   createIngredient(data: any) {
//     const newIngredient = new this.ingredientModel(data);
//     return newIngredient.save();
//   }

//   findAllIngredients() {
//     return this.ingredientModel.find().exec();
//   }

//   attachIngredients(pizzaId: string, ingredientIds: string[]) {
//     return this.pizzaModel
//       .findByIdAndUpdate(pizzaId, { ingredients: ingredientIds }, { new: true })
//       .populate('ingredients')
//       .exec();
//   }
// }
