import { Injectable } from '@angular/core';
import { Subject } from 'rxjs/Subject';

import { Recipe } from './recipe.model';
import { Ingredient } from '../shared/ingredient.model';
import { ShoppingListService } from '../shopping-list/shopping-list.service';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { map, tap, take, exhaustMap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class RecipeService {
  recipesChanged = new Subject<Recipe[]>();
  apiURL = 'https://angular-recipe-book-5b43d.firebaseio.com/recipes.json';

  httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  private recipes: Recipe[] = [];

  constructor(private slService: ShoppingListService, private http: HttpClient, private authService: AuthService) {}

  storeRecipes() {
    console.log(this.recipes);
    return this.http
    .put(this.apiURL, this.recipes)
    .subscribe(x => console.log(x));
  }

  fetchRecipes() {
// 'take()' wezmie tylko jedno value z tego observabla i pozniej sie odsubskrybuje.
// exhaustMap czeka az skonczymy subskrypcje (czyli jak dostaniemy 1 usera)
    return this.authService.user.pipe(
      take(1),
      exhaustMap(user => {
      return this.http.get<Recipe[]>(
        this.apiURL,
        {
          params: new HttpParams().set('auth', user.token)
        }
        );
    }),
    map(recipes => {
      return recipes.map(recipe => {
        return {
          ...recipe,
          ingredients: recipe.ingredients ? recipe.ingredients : []
        };
      });
    }),
    tap(recipes => {
      this.recipesChanged.next(recipes.slice());
    })
  );
  }

  getRecipes() {
    return this.recipes.slice();
  }

  getRecipe(index: number) {
    console.log(this.recipes)
    return this.recipes[index];
  }

  getRecipesFromServer(): Observable<Recipe[]> {
    return this.authService.user.pipe(
      take(1),
      exhaustMap(user => {
      return this.http.get<Recipe[]>(
        this.apiURL,
        {
          params: new HttpParams().set('auth', user.token)
        }
        );
    }));
  }

  addIngredientsToShoppingList(ingredients: Ingredient[]) {
    this.slService.addIngredients(ingredients);
  }

  addRecipe(recipe: Recipe) {
    this.recipes.push(recipe);
    this.recipesChanged.next(this.recipes.slice());
  }

  updateRecipe(index: number, newRecipe: Recipe) {
    this.recipes[index] = newRecipe;
    this.recipesChanged.next(this.recipes.slice());
  }

  deleteRecipe(index: number) {
    this.recipes.splice(index, 1);
    this.recipesChanged.next(this.recipes.slice());
  }
}
