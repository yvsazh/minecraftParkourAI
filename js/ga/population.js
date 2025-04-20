class Population {
    constructor(scene, world, size) {
        this.players = new Array(size);

        this.fitnessSum = 0;
        this.gen = 0;
        this.size = size;
        this.bestPlayer = 0;

        this.bestDirections = [];
        this.everyoneDiesByPlayerCounter = 0;

        this.init();
    }

    init() {
        for (var i = 0; i < this.players.length; i++) {
            this.players[i] = new Player(scene, world);
        }

    }

    update() {
        for (var i = 0; i < this.players.length; i++) {
            this.players[i].update();
            if (seeBest == true && i != 0) {
                if (this.players[i].mesh) {
                    this.players[i].mesh.visible = false;
                }
                
            }
        }
    }

    calculateFitness() {
        for (var player of this.players) {
            player.calculateFitness();
        }
    };

    calculateFitnessSum() {
        this.fitnessSum = 0;
        for (var player of this.players) {
            this.fitnessSum += player.fitness;
        }
    }

    selectParent() {
        var rand = random(0, this.fitnessSum);
        var runningSum = 0;
        for (var i = 0; i < this.players.length; i++) {
            runningSum += this.players[i].fitness;
            if (runningSum > rand) {
                // console.log("PARENT:", this.players[i].fitness);
                return this.players[i];
            }
        }

        return null;
    };

    findBestPlayer() {
        var max = 0
		for (var i = 0; i < this.players.length; i++) {
			if (this.players[i].fitness > max) {
				max = this.players[i].fitness;
                // console.log("MAX: ", i, max)
				this.bestPlayer = i;
			}
		};
        // console.log("BEST:", max, this.bestPlayer, this.players[this.bestPlayer].fitness);
    }
    everyoneDeadBySpider() {
        for (var player of this.players) {
            if (!player.deadBySpider) {
                return false;
            }
        }

        return true;
    };
    naturalSelection() {
        var newPlayers = new Array(this.players.length);
        this.calculateFitnessSum();

        this.findBestPlayer();
        newPlayers[0] = this.players[this.bestPlayer].copy();
        newPlayers[0].best = true;
        for (var i = 1; i < newPlayers.length; i++) {
            // var parentA = this.selectParent();
            // var parentB = this.selectParent();
            // newPlayers[i] = parentA.giveBaby(parentB);
            // -- easy variant
            var parentA = this.selectParent();
            newPlayers[i] = parentA.copy();
        }

        for (var i = 0; i < this.players.length; i++) {
            this.players[i].dispose();
        }
        this.players = [].concat(newPlayers);
        this.gen++;
        document.querySelector("#gen").innerHTML = `${population.gen}`;
    }

    killEveryone() {
        for (var player of this.players) {
            player.dead = true;
            player.dispose();
        }
    }

    mutate() {
        for (var i = 0; i < this.players.length; i++) {
            this.players[i].brain.mutate(this.players[i].fall);
        }
    }

    allPlayersDead() {
        for (var player of this.players) {
            if (!player.dead) {
                return false;
            }
        }

        return true;
    };
    increaseMoves() {
        for (var i = 0; i< this.players.length; i++) {
            this.players[i].brain.increaseMoves();
        }
    }
}