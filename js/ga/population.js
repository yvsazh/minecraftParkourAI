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
                return this.players[i];
            }
        }

        return null;
    };

    findBestPlayer() {
        var max = 0
		for (var i = 0; i < this.players.length; i++) {
			if (this.players[i].fitness > max && !this.players[i].deadBySpider) {
				max = this.players[i].fitness;
				this.bestPlayer = i;
			}
		};
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

        this.deadBySpider = this.everyoneDeadBySpider();

        newPlayers[0] = this.players[this.bestPlayer].copy();
        newPlayers[0].best = true;
        for (var i = 1; i < newPlayers.length; i++) {
            // var parentA = this.selectParent();
            // var parentB = this.selectParent();
            // newPlayers[i] = parentA.giveBaby(parentB);
            var parentA = this.selectParent();
            // console.log(parentA.)
            newPlayers[i] = parentA.copy();
        }

        this.players = [].concat(newPlayers);
        for (var i = 0; i < this.players.length; i++) {
            for (var j = 0; j < this.players.length; j++) {
                this.players[i].sprite.overlap(this.players[j].sprite);
            }
        }
        this.gen++;
        genText.text = `Покоління: ${population.gen}`;
    }

    killEveryone() {
        for (var player of this.players) {
            player.dead = true;
            player.sprite.remove();
            player.deadBySpider = true;
        }
    }

    mutate() {
        for (var i = 0; i < this.players.length; i++) {
            console.log(this.players[i].deadBySpider);
            this.players[i].brain.mutate(this.players[i].deadBySpider);
            this.players[i].deadBySpider = false;
        }
    }

    removeAllSprites() {
        for (var i = 0; i < this.players.length; i++) {
            this.players[i].sprite.remove();
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