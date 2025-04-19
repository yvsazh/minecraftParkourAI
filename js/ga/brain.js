class Brain {
    constructor(size) {
        this.directions = [];
        this.step = 0;
        this.mutationRate = 0.01;

        this.choices = [1, 2, 3, 4, 5, 6]; // W A S D Space Nothing

        this.randomize(size);
    }

    randomize(size) {
        for (var i = 0; i < size; i++) {
            this.directions.push(choose(this.choices));
        }
    }

    crossover(partner) {
        var newBrain = new Brain(this.directions.length);
        var midPoint = this.directions.length/2;
        for (var i = 0; i < this.directions.length; i++) {
            if (i < midPoint) {
                newBrain.directions[i] = this.directions[i];
            } else {
                newBrain.directions[i] = partner.directions[i];
            }
        }

        return newBrain;
    };

    clone() {
        var newBrain = new Brain(this.directions.length);
        newBrain.directions = [].concat(this.directions);
        return newBrain;
    };

    mutate(died) {
        for (let i = 0; i < this.directions.length; i++) {
            var rand = random(1);
              if (died) {
                console.log("ok");
                rand = random(0.2);
              }
            if (rand < this.mutationRate) {
                this.directions[i] = choose(this.choices);
            }
        }
    };

    increaseMoves() {
        for(var i = 0 ; i < increaseMovesBy ;i++){
            this.directions.push(choose(this.choices));
        }
    }
}