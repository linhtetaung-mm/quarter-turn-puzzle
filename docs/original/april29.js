var rows = 4, cols = 4;
var board = [
						[ 8, 3,12,16],
[ 1, 9,11, 2],
[13,15,10, 7],
[14, 5, 4, 6]];//lvl 29

var target = [
			[ 1, 2, 3, 4],
			[ 5, 6, 7, 8],
			[ 9,10,11,12],
			[13,14,15,16]];

var boxes = [], steps_count = 0;

class Square{
	constructor(p){
		this.place = p;
		this.border = [];
	}
}

main();
function main(){
	
	boxes = findSquares([], 2);
	console.log("The target : ");
	console.table(target);
	console.log("The uncomplete board : ");
	console.table(board);

	console.log("\nFirst part : ");
	for(let i=0; i<rows-2; i++){
		for(let j=0; j<cols; j++){
			var number = target[i][j];
			var row = findRow(number, i);
			var col = board[row].indexOf(number);

			if(col>j){//Going Left to align the Number
				while(col>j){
					if(row === rows - 1)
						board = goLeft(board, row, col, 1, 0);
					else
						board = goLeft(board, row, col, 0, 1);
					col--;
				}
			}
			else{//Going Right
				while(col<j){
					if(row === rows - 1)
						board = goRight(board, row, col, 1, 0);
					else
						board = goRight(board, row, col, 0, 1);
					col++;
				}
			}

			if(j === cols-1 && board[i][j] !== number){
				if(row>i+2){
					while(row>i+2){
						board = goUp(board, row, col, 1, 0);
						row--;
					}
				}
				else{
					while(row<i+2){
						board = goDown(board, row, col, 1, 0);
						row++;
					}
				}
				board = goDown(board, i, j, 1, 0);
				board = goUp(board, i+2, j, 1, 0);
				board = goUp(board, i+1, j, 1, 0);
			}
			else{
				while(row>i){
					board = goUp(board, row, col, 0, 1);
					row--;
				}
			}

		
		}
	}
	console.table(board);

	console.log("\nSecond part : ");
	for(let j=0; j<cols-2; j++){
		for(let i=rows-2; i<rows; i++){
			var number = target[i][j];
			var row = findRow(number, rows-2);
			var col = board[row].indexOf(number);
			// console.log("number : " + number + ", row : " + row + ", col : " + col);
			
			if(i < rows-1){
				//Going Left to align the Number
				while(col>j){
					if(row === rows - 1)
						board = goLeft(board, row, col, 1, 0);
					else
						board = goLeft(board, row, col, 0, 1);
					col--;
				}

				while(row > i){
					board = goUp(board, row, col, 0, 1);
					row--;
				}
			}
			else{
				if(board[i][j] !== number){
					while(row < rows-1){
						if(col === cols-1)
							board = goDown(board, row, col, 1, 0);
						else
							board = goDown(board, row, col, 0, 1);
						row++;
					}

					if(col < j+2){
						while(col<j+2){
							board = goRight(board, row, col, 1, 0);
							col++;
						}
					}
					else{
						while(col>j+2){
							board = goLeft(board, row, col, 1, 0);
							col--;
						}
					}
					board = goRight(board, i, j, 1, 0);
					board = goLeft(board, i, j+2, 1, 0);
					board = goLeft(board, i, j+1, 1, 0);
				}
			}
		}
	}
	console.table(board);

	console.log("\nThird part : ");
	var check_all = checkSolution(board, 0, 0);
	if(check_all.length === 0){
		console.log("No Move");
	}
	else if(check_all.length > 4){
		console.log("Error on Second Part");
	}
	else{
		for(let i=0; i<4; i++){
			console.table(board);
			var reminants = checkSolution(board, rows-2, cols-2);
			if(reminants.length === 0){
				break;
			}
			else if(reminants.length === 2){
				var array = identifyPattern(reminants, boxes.length-1);
				console.log("unsolved numbers : "+reminants);
				console.log("pattern : "+array);
				keyFormula(array);
			}
			else{
				board = rotateSquare(board, boxes.length - 1, 1, "clockwise");
			}
		}
	}

	console.log("\nFinished!!!\nThe board is : ");
	console.table(board);

console.log("Count : " + steps_count);
}

function keyFormula(pattern){

	if(pattern[0] === pattern[1] && pattern[2] === pattern[3]){
		if(pattern[0] === 0){
			board = rotateSquare(board, 4, 1, "anticlock");
			board = rotateSquare(board, 2, 1, "anticlock");
			board = rotateSquare(board, 4, 1, "clockwise");
			board = rotateSquare(board, 5, 1, "clockwise");
			board = rotateSquare(board, 2, 1, "clockwise");
		}
		else{
			board = rotateSquare(board, 7, 1, "anticlock");
			board = rotateSquare(board, 5, 1, "anticlock");
			board = rotateSquare(board, 7, 1, "clockwise");
			board = rotateSquare(board, 8, 1, "clockwise");
			board = rotateSquare(board, 5, 1, "clockwise");
		}
	}
	else if(pattern[0] === pattern[3] && pattern[1] === pattern[2]){
		if(pattern[0] === 0){
			board = rotateSquare(board, 4, 1, "clockwise");
			board = rotateSquare(board, 6, 1, "clockwise");
			board = rotateSquare(board, 4, 1, "anticlock");
			board = rotateSquare(board, 7, 1, "anticlock");
			board = rotateSquare(board, 6, 1, "anticlock");
		}
		else{
			board = rotateSquare(board, 5, 1, "clockwise");
			board = rotateSquare(board, 7, 1, "clockwise");
			board = rotateSquare(board, 5, 1, "anticlock");
			board = rotateSquare(board, 8, 1, "anticlock");
			board = rotateSquare(board, 7, 1, "anticlock");
		}
	}
	else{
		board = rotateSquare(board, 4, 1, "anticlock");
		board = rotateSquare(board, 2, 1, "anticlock");
		board = rotateSquare(board, 4, 1, "clockwise");
		board = rotateSquare(board, 5, 1, "clockwise");
		board = rotateSquare(board, 2, 1, "clockwise");

		board = rotateSquare(board, 7, 1, "anticlock");
		board = rotateSquare(board, 5, 1, "anticlock");
		board = rotateSquare(board, 7, 1, "clockwise");
		board = rotateSquare(board, 8, 1, "clockwise");
		board = rotateSquare(board, 5, 1, "clockwise");

		if(pattern[0] === 0)
			board = rotateSquare(board, 8, 1, "clockwise");
		else
			board = rotateSquare(board, 8, 1, "anticlock");	
	}
}

function identifyPattern(arr, place){
	var array = new Array(4).fill(1);
	var correct_array = boxes[place].border;
	for(let i=0; i<arr.length; i++)
		if(correct_array.includes(arr[i]-1))
			array[correct_array.indexOf(arr[i]-1)] = 0;
	
	return array;
}

function checkSolution(grid, row, col){
	var array = [];
	for(var i=row; i<rows; i++){
		for(var j=col; j<cols; j++){
			if(grid[i][j] !== target[i][j])
				array.push(grid[i][j]);
		}
	}
	return array;
}

function rotateSquare(grid, place, count, direction){//clockwise
		
	steps_count++;
	var array = deepCopy(boxes[place].border);

	if(direction === 'clockwise')//Rotate clockwise
		for(let i=0; i<count; i++)
			array.unshift(array.pop());
	else 												//Rotate anticlockwise
		for(let i=0; i<count; i++)
			array.push(array.shift());

	for(let i=0; i<array.length; i++){
		var a = Math.floor(array[i]/cols);
		var b = array[i]%cols;
		array[i] = grid[a][b];
	}

	for(let i=0; i<array.length; i++){
		var arr = boxes[place].border;
		var a = Math.floor(arr[i]/cols);
		var b = arr[i]%cols;
		grid[a][b] = array[i];
	}
	return grid;
}

function goUp(grid, row, col, left, right){

	if(row>0){
		var adj_row = row -1;
		if(col>0 && left === 1){
			var adj_col = col -1;
			var number = adj_row*cols + adj_col;
			var rotatable_index = findBoxIndex(number);
			return(rotateSquare(grid, rotatable_index, 1, "anticlock"));
		}

		if(col<cols-1 && right === 1){
			var adj_col = col;
			var number = adj_row*cols + adj_col;
			var rotatable_index = findBoxIndex(number);
			return(rotateSquare(grid, rotatable_index, 1, "clockwise"));
		}
	}
	return 0;
}

function goDown(grid, row, col, left, right){

	if(row<rows-1){
		if(col>0 && left === 1){
			var adj_col = col -1;
			var number = row*cols + adj_col;
			var rotatable_index = findBoxIndex(number);
			return(rotateSquare(grid, rotatable_index, 1, "clockwise"));
		}

		if(col<cols-1 && right === 1){
			var number = row*cols + col;
			var rotatable_index = findBoxIndex(number);
			return(rotateSquare(grid, rotatable_index, 1, "anticlock"));
		}

	}
	return 0;
}

function goLeft(grid, row, col, up, down){

	if(col>0){
		var adj_col = col -1;
		if(row>0 && up === 1){
			var adj_row = row -1;
			var number = adj_row*cols + adj_col;
			var rotatable_index = findBoxIndex(number);
			return(rotateSquare(grid, rotatable_index, 1, "clockwise"));
		}

		if(row<rows-1 && down === 1){
			var adj_row = row;
			var number = adj_row*cols + adj_col;
			var rotatable_index = findBoxIndex(number);
			return(rotateSquare(grid, rotatable_index, 1, "anticlock"));
		}
	}
	return 0;
}

function goRight(grid, row, col, up, down){

	if(col<cols-1){
		if(row>0 && up === 1){
			var adj_row = row -1;
			var number = adj_row*cols + col;
			var rotatable_index = findBoxIndex(number);
			return(rotateSquare(grid, rotatable_index, 1, "anticlock"));
		}

		if(row<rows-1 && down === 1){
			var number = row*cols + col;
			var rotatable_index = findBoxIndex(number);
			return(rotateSquare(grid, rotatable_index, 1, "clockwise"));
		}
	}
	return 0;
}

function findSquares(squares, size){
	//number of squares = (rows-size+1) * (cols-size+1)
	var count = 0;
	for(let i=0; i<rows-size+1; i++){
		for(let j=0; j<cols-size+1; j++){
			squares[count] = new Square(i*cols + j);//start from zero or one
			squares[count].border = findBorder(squares[count].place, size);
			count++;
		}
	}
	return squares;
}

function findBorder(place, size){
	//number of border elements of a square = (size-1)*4
	var array = [], count = 0;

	for(let i=0; i<size-1; i++)
		array[count++] = ++place;
	for(let i=0; i<size-1; i++)
		array[count++] = place+=cols;
	for(let i=0; i<size-1; i++)
		array[count++] = --place;
	for(let i=0; i<size-1; i++)
		array[count++] = place-=cols;

	array.unshift(array.pop());
	return array;
}

function findRow(n, start){
	for(let i=start; i<rows; i++){
		if(board[i].includes(n))
			return i;
	}
}

function findBoxIndex(num){
	for(let i=0; i<boxes.length; i++){
		if(boxes[i].place === num){
			return i;
		}
	}
}

function deepCopy(arr){
  let copy = [];
  arr.forEach(elem => {
    if(Array.isArray(elem))
      copy.push(deepCopy(elem));
    else
        copy.push(elem);
  });
  return copy;
}
