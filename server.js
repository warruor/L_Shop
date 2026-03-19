const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
const app = express();


app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const db = mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'shop' 
});


db.connect((err) => {
    if (err) {
        console.error('Ошибка подключения к MySQL:', err);
        return;
    }
    console.log('Подключено к базе данных shop');
    
    db.query('SHOW TABLES', (err, tables) => {
        if (err) {
            console.error('Ошибка при получении списка таблиц:', err);
        } else {
            console.log('Таблицы в базе shop:');
            tables.forEach(table => {
                console.log('   - ' + Object.values(table)[0]);
            });
        }
    });
});

app.get('/api/products', (req, res) => {
    console.log('Запрос товаров из таблицы shopchik');
    db.query('SELECT * FROM shopchik', (err, results) => {
        if (err) {
            console.error('Ошибка получения товаров:', err);
            res.status(500).json({ error: err.sqlMessage });
        } else {
            console.log(`Найдено ${results.length} товаров`);
            res.json(results);
        }
    });
});

app.post('/api/auth/register', async (req, res) => {
    console.log('Запрос регистрации');
    const { name, phone, password } = req.body;
    
    if (!name || !phone || !password) {
        return res.status(400).json({ error: 'Все поля обязательны' });
    }
    
    try {
        db.query('SELECT * FROM users WHERE phone = ?', [phone], async (err, results) => {
            if (err) {
                console.error('Ошибка SQL:', err);
                return res.status(500).json({ error: err.sqlMessage });
            }
            
            if (results.length > 0) {
                return res.status(400).json({ error: 'Пользователь уже существует' });
            }
            
            const hashedPassword = await bcrypt.hash(password, 10);
            db.query(
                'INSERT INTO users (name, phone, password) VALUES (?, ?, ?)',
                [name, phone, hashedPassword],
                (err, result) => {
                    if (err) {
                        console.error('❌ Ошибка при вставке:', err);
                        return res.status(500).json({ error: err.sqlMessage });
                    }
                    
                    console.log('✅ Успешная регистрация:', name);
                    res.json({ 
                        id: result.insertId, 
                        name, 
                        phone,
                        message: 'Регистрация успешна' 
                    });
                }
            );
        });
    } catch (error) {
        console.error('Ошибка:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/auth/login', (req, res) => {
    console.log('Запрос входа');
    const { phone, password } = req.body;
    
    db.query('SELECT * FROM users WHERE phone = ?', [phone], async (err, results) => {
        if (err) {
            console.error('Ошибка SQL:', err);
            return res.status(500).json({ error: err.sqlMessage });
        }
        
        if (results.length === 0) {
            return res.status(401).json({ error: 'Пользователь не найден' });
        }
        
        const user = results[0];
        const match = await bcrypt.compare(password, user.password);
        
        if (match) {
            console.log('Успешный вход:', user.name);
            res.json({ 
                id: user.id, 
                name: user.name, 
                phone: user.phone 
            });
        } else {
            res.status(401).json({ error: 'Неверный пароль' });
        }
    });
});

app.post('/api/orders/checkout', (req, res) => {
    console.log('Оформление заказа');
    const { userId, items, total, adress, deliveryTime } = req.body;
    
    db.query(
        'INSERT INTO orders (user_id, total, adress, delivery_time, status, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
        [userId, total, adress, deliveryTime, 'новый'],
        (err, result) => {
            if (err) {
                console.error('Ошибка создания заказа:', err);
                return res.status(500).json({ error: err.sqlMessage });
            }
            
            const orderId = result.insertId;
            let completed = 0;
            
            items.forEach(item => {
                db.query(
                    'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
                    [orderId, item.productId, 1, item.price],
                    (err) => {
                        if (err) console.error('❌ Ошибка добавления товара:', err);
                        completed++;
                        if (completed === items.length) {
                            console.log(`Заказ #${orderId} оформлен`);
                            res.json({ 
                                success: true, 
                                orderId,
                                message: 'Заказ оформлен' 
                            });
                        }
                    }
                );
            });
        }
    );
});

app.get('/api/orders', (req, res) => {
    const { userId } = req.query;
    console.log(`📋 Запрос заказов пользователя #${userId}`);
    
    const query = `
        SELECT o.*, 
               GROUP_CONCAT(CONCAT(s.name, ':', oi.quantity, ':', oi.price) SEPARATOR '||') as items_list
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN shopchik s ON oi.product_id = s.id
        WHERE o.user_id = ?
        GROUP BY o.id
        ORDER BY o.created_at DESC
    `;
    
    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('❌ Ошибка получения заказов:', err);
            return res.status(500).json({ error: err.sqlMessage });
        }
        
        const orders = results.map(order => ({
            ...order,
            items: order.items_list ? order.items_list.split('||').map(item => {
                const [name, quantity, price] = item.split(':');
                return { name, quantity: parseInt(quantity), price: parseFloat(price) };
            }) : []
        }));
        
        console.log(`Найдено ${orders.length} заказов`);
        res.json(orders);
    });
});

// app.get('/api/test', (req, res) => {
//     res.json({ 
//         message: 'Сервер работает!',
//         database: 'shop',
//         time: new Date().toISOString()
//     });
// });

const PORT = 3000;
app.listen(PORT, () => {
    console.log('сервер УРА заработал');

});