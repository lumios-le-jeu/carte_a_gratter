// Système de balles rebondissantes avec physique de billard
class Ball {
    constructor(x, y, vx, vy, color) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.radius = 40; // 80px / 2
        this.element = null;
    }

    changeColor() {
        const colors = {
            red: ['blue', 'green'][Math.floor(Math.random() * 2)],
            blue: 'green',
            green: 'blue'
        };
        this.color = colors[this.color] || 'red';
        this.updateElementColor();
    }

    updateElementColor() {
        if (this.element) {
            const colorMap = {
                red: '#ff4444',
                blue: '#4444ff',
                green: '#44ff44'
            };
            this.element.style.background = colorMap[this.color];
        }
    }

    update(width, height, balls) {
        // Mise à jour de la position
        this.x += this.vx;
        this.y += this.vy;

        // Collision avec les bords
        if (this.x - this.radius <= 0 || this.x + this.radius >= width) {
            this.vx = -this.vx;
            this.x = Math.max(this.radius, Math.min(width - this.radius, this.x));
            this.changeColor();
        }

        if (this.y - this.radius <= 0 || this.y + this.radius >= height) {
            this.vy = -this.vy;
            this.y = Math.max(this.radius, Math.min(height - this.radius, this.y));
            this.changeColor();
        }

        // Collision avec les autres balles
        balls.forEach(other => {
            if (other !== this) {
                const dx = other.x - this.x;
                const dy = other.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < this.radius + other.radius) {
                    // Changement de couleur pour les deux balles
                    this.changeColor();
                    other.changeColor();

                    // Calcul de l'angle de collision
                    const angle = Math.atan2(dy, dx);
                    const sin = Math.sin(angle);
                    const cos = Math.cos(angle);

                    // Rotation des vitesses
                    const vx1 = this.vx * cos + this.vy * sin;
                    const vy1 = this.vy * cos - this.vx * sin;
                    const vx2 = other.vx * cos + other.vy * sin;
                    const vy2 = other.vy * cos - other.vx * sin;

                    // Échange des vitesses (collision élastique)
                    const finalVx1 = vx2;
                    const finalVx2 = vx1;

                    // Rotation inverse
                    this.vx = finalVx1 * cos - vy1 * sin;
                    this.vy = vy1 * cos + finalVx1 * sin;
                    other.vx = finalVx2 * cos - vy2 * sin;
                    other.vy = vy2 * cos + finalVx2 * sin;

                    // Séparation des balles pour éviter qu'elles restent collées
                    const overlap = this.radius + other.radius - distance;
                    const separationX = (overlap / 2) * cos;
                    const separationY = (overlap / 2) * sin;
                    this.x -= separationX;
                    this.y -= separationY;
                    other.x += separationX;
                    other.y += separationY;
                }
            }
        });

        // Mise à jour de la position de l'élément DOM
        if (this.element) {
            this.element.style.left = `${this.x - this.radius}px`;
            this.element.style.top = `${this.y - this.radius}px`;
        }
    }
}

// Initialisation du système de balles
function initBalls() {
    const container = document.querySelector('.bouncing-balls');
    if (!container) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const isMobile = width < 768;

    // Sur mobile: seulement 2 balles pour éviter l'envahissement
    // Sur desktop: 5 balles
    const balls = isMobile ? [
        new Ball(width * 0.1, height * 0.2, 1.5, 1, 'red'),
        new Ball(width * 0.7, height * 0.5, -1.3, 1.5, 'red')
    ] : [
        new Ball(width * 0.1, height * 0.2, 2, 1.5, 'red'),
        new Ball(width * 0.7, height * 0.3, -1.8, 2.2, 'red'),
        new Ball(width * 0.4, height * 0.5, 1.5, -1.8, 'red'),
        new Ball(width * 0.2, height * 0.7, -2.2, -1.5, 'red'),
        new Ball(width * 0.8, height * 0.2, 1.8, 2, 'red')
    ];

    // Supprimer les anciennes balles CSS
    container.innerHTML = '';

    // Créer les éléments DOM pour chaque balle
    balls.forEach((ball, index) => {
        const element = document.createElement('div');
        element.className = 'ball-physics';
        element.style.position = 'absolute';
        element.style.width = '80px';
        element.style.height = '80px';
        element.style.borderRadius = '50%';
        element.style.opacity = '0.6';
        element.style.filter = 'blur(1px)';
        ball.element = element;
        ball.updateElementColor();
        container.appendChild(element);
    });

    // Animation
    function animate() {
        const currentWidth = window.innerWidth;
        const currentHeight = window.innerHeight;

        balls.forEach(ball => {
            ball.update(currentWidth, currentHeight, balls);
        });

        requestAnimationFrame(animate);
    }

    animate();
}

// Démarrer quand la page est chargée
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBalls);
} else {
    initBalls();
}
