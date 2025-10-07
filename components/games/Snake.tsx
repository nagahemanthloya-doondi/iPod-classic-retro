
import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';

// Game constants
const TILE_SIZE = 10;
const TILE_COUNT_X = 32;
const TILE_COUNT_Y = 24;
const INITIAL_SNAKE_LENGTH = 5;
const GAME_SPEED_MS = 100;

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

interface Position {
    x: number;
    y: number;
}

interface GameState {
    snake: Position[];
    food: Position;
    direction: Direction;
    isStarted: boolean;
    gameOver: boolean;
    score: number;
}

interface SnakeProps {
    goBack: () => void;
}

const Snake = forwardRef<{ turn: (dir: 'left' | 'right') => void; startGame: () => void; setDirection: (dir: Direction) => void; }, SnakeProps>(({ goBack }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const timeoutIdRef = useRef<number>();
    const gameStateRef = useRef<GameState | null>(null);

    const generateFood = (snakeBody: Position[]): Position => {
        let foodPosition: Position;
        do {
            foodPosition = {
                x: Math.floor(Math.random() * TILE_COUNT_X),
                y: Math.floor(Math.random() * TILE_COUNT_Y),
            };
        } while (snakeBody.some(segment => segment.x === foodPosition.x && segment.y === foodPosition.y));
        return foodPosition;
    };

    const initializeGameState = (): GameState => {
        const startX = Math.floor(TILE_COUNT_X / 2);
        const startY = Math.floor(TILE_COUNT_Y / 2);
        const initialSnake: Position[] = [];
        for (let i = 0; i < INITIAL_SNAKE_LENGTH; i++) {
            initialSnake.push({ x: startX - i, y: startY });
        }

        return {
            snake: initialSnake,
            food: generateFood(initialSnake),
            direction: 'RIGHT',
            isStarted: false,
            gameOver: false,
            score: 0,
        };
    };

    useImperativeHandle(ref, () => ({
        turn: (turnDirection) => {
            if (!gameStateRef.current || !gameStateRef.current.isStarted) return;
            const state = gameStateRef.current;
            const { direction } = state;

            if (turnDirection === 'right') {
                if (direction === 'UP') state.direction = 'RIGHT';
                else if (direction === 'RIGHT') state.direction = 'DOWN';
                else if (direction === 'DOWN') state.direction = 'LEFT';
                else if (direction === 'LEFT') state.direction = 'UP';
            } else { // 'left'
                if (direction === 'UP') state.direction = 'LEFT';
                else if (direction === 'LEFT') state.direction = 'DOWN';
                else if (direction === 'DOWN') state.direction = 'RIGHT';
                else if (direction === 'RIGHT') state.direction = 'UP';
            }
        },
        startGame: () => {
            if (!gameStateRef.current) return;
            if (gameStateRef.current.gameOver) {
                gameStateRef.current = initializeGameState();
            }
            if (!gameStateRef.current.isStarted) {
                gameStateRef.current.isStarted = true;
                gameLoop();
            }
        },
        setDirection: (newDirection) => {
            if (!gameStateRef.current || !gameStateRef.current.isStarted) return;
            const state = gameStateRef.current;
            const { direction } = state;

            // Prevent snake from reversing on itself
            if (newDirection === 'UP' && direction === 'DOWN') return;
            if (newDirection === 'DOWN' && direction === 'UP') return;
            if (newDirection === 'LEFT' && direction === 'RIGHT') return;
            if (newDirection === 'RIGHT' && direction === 'LEFT') return;

            state.direction = newDirection;
        },
    }));

    const draw = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas || !gameStateRef.current) return;

        const state = gameStateRef.current;

        // Clear canvas
        ctx.fillStyle = '#d1d5db'; // gray-300
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw snake
        ctx.fillStyle = '#16a34a'; // green-600
        state.snake.forEach(segment => {
            ctx.fillRect(segment.x * TILE_SIZE, segment.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        });

        // Draw food
        ctx.fillStyle = '#dc2626'; // red-600
        ctx.fillRect(state.food.x * TILE_SIZE, state.food.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        
        // Score Text
        ctx.font = 'bold 12px sans-serif';
        ctx.fillStyle = '#1f2937';
        ctx.textAlign = 'left';
        ctx.fillText(`Score: ${state.score}`, 8, 14);

        if (!state.isStarted) {
            drawInfo("Snake", "Press Center Button to Start");
        } else if (state.gameOver) {
            drawInfo("GAME OVER", "Press Center Button to Restart");
        }
    };
    
    const drawInfo = (text: string, subtext: string = "") => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas) return;

        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = "bold 24px sans-serif";
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.fillText(text, canvas.width / 2, canvas.height / 2 - 10);
        if (subtext) {
            ctx.font = "16px sans-serif";
            ctx.fillText(subtext, canvas.width / 2, canvas.height / 2 + 20);
        }
    };


    const gameLoop = () => {
        if (!gameStateRef.current || !gameStateRef.current.isStarted || gameStateRef.current.gameOver) {
            draw();
            return;
        }

        const state = gameStateRef.current;
        const head = { ...state.snake[0] };
        
        // Move head
        switch (state.direction) {
            case 'UP': head.y -= 1; break;
            case 'DOWN': head.y += 1; break;
            case 'LEFT': head.x -= 1; break;
            case 'RIGHT': head.x += 1; break;
        }

        // Wall collision
        if (head.x < 0 || head.x >= TILE_COUNT_X || head.y < 0 || head.y >= TILE_COUNT_Y) {
            state.gameOver = true;
        }

        // Self collision
        if (state.snake.some(segment => segment.x === head.x && segment.y === head.y)) {
            state.gameOver = true;
        }

        state.snake.unshift(head);
        
        // Food collision
        if (head.x === state.food.x && head.y === state.food.y) {
            state.score += 1;
            state.food = generateFood(state.snake);
        } else {
            state.snake.pop();
        }

        draw();

        if (!state.gameOver) {
            timeoutIdRef.current = window.setTimeout(gameLoop, GAME_SPEED_MS);
        }
    };
    
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = TILE_COUNT_X * TILE_SIZE;
        canvas.height = TILE_COUNT_Y * TILE_SIZE;

        gameStateRef.current = initializeGameState();
        draw(); // Draw initial screen

        return () => {
            if (timeoutIdRef.current) {
                clearTimeout(timeoutIdRef.current);
            }
        };
    }, []);

    return (
        <div className="w-full h-full bg-gray-300 flex items-center justify-center">
            <canvas ref={canvasRef} />
        </div>
    );
});

export default Snake;