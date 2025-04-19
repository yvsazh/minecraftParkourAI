class Player {
    constructor(x=width/2, y=height/2+200) {
        this.speed = 5;
        this.width = 25;
        this.height = 25;

        this.position = 1;
        this.dead = false;

        this.isPlayer = false;
        this.best = false;

        this.sprite = new Sprite(x, y, 30, 30);
        player_img.resize(this.width, this.height);
        this.sprite.image = player_img;
        this.sprite.rotationLock = true;

        this.brain = new Brain(moves);
        this.fitness = 0;

        this.lifeTime = 0;
        this.score = 0;
        this.deadBySpider = false;
        this.deadOnStep = 0;

        this.sprite.update = () => {
            if(this.best) {
                push();
                stroke(0, 255, 0);
                noFill();
                rectMode(CENTER);
                rect(this.sprite.x, this.sprite.y, this.sprite.width+10, this.sprite.height+10);
                pop();
            }
            this.lifeTime++;
            if (this.brain.directions.length > this.brain.step) {
                var direction = this.brain.directions[this.brain.step];
                if (direction == 1) {
                    this.moveUp();
                }
                if (direction == 2) {
                    this.sprite.x -= this.speed; // move left
                }
                if (direction == 3) {
                    this.moveDown();
                }
                if (direction == 4) {
                    this.sprite.x += this.speed; // move right
                }
                this.brain.step++;
            } else {
                this.dead = true;
                console.log("all good");
            }
            for (var spider of spiders) {
                // console.log(dist(this.sprite.x, 0, spider.sprite.x, 0));
                if (spider.activated && dist(this.sprite.x, 0, spider.sprite.x, 0) < 200 && this.position != spider.position) {
                    this.score++;
                };

                // if (this.sprite.overlapping(spider.sprite)) {
                //     this.dead = true;
                //     this.deadBySpider = true;
                //     this.sprite.remove();
                // }
            };
        }
    };

    moveUp() {
        const nextRoad = roads.find(road => road.position === this.position - 1);
        if (nextRoad) {
            this.position = nextRoad.position;
            // this.sprite.y = nextRoad.sprite.y; 
            this.sprite.moveTo(this.sprite.x, nextRoad.sprite.y, 30);
        }
    }

    moveDown() {
        const nextRoad = roads.find(road => road.position === this.position + 1);
        if (nextRoad) {
            this.position = nextRoad.position;
            // this.sprite.y = nextRoad.sprite.y;
            this.sprite.moveTo(this.sprite.x, nextRoad.sprite.y, 30);
        }
    }

    moveByPlayer() {
        if (kb.pressing("A")) {
            this.sprite.x -= this.speed;
        }
        if (kb.pressing("D")) {
            this.sprite.x += this.speed;
        }
        if (kb.presses("W")) {
            this.moveUp();
        }
        if (kb.presses("S")) {
            this.moveDown();
        }
    }

    calculateFitness() {
		// Базовий фітнес за час виживання
		this.fitness = this.lifeTime * this.lifeTime;
        this.fitness += this.score * 100;
        if(this.deadBySpider) {
            this.fitness *= 0.7;
        } else {
            this.fitness *= 2;
        }
        // console.log(this.score);
    }

    giveBaby(partner) {
        var child = new Player();
        child.brain = this.brain.crossover(partner.brain);
        return child;
    };

    copy() {
        var baby = new Player();
        baby.brain = this.brain.clone();
        baby.deadBySpider = this.deadBySpider;
        return baby;
    }
}