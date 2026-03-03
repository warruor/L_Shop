let cart = [];

function showPage(pageId) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
        page.style.display = 'none';
    });
    document.getElementById(pageId).style.display = 'block';
}

function addToCart(title, price) {
    cart.push({ title, price });
    alert(`${title} добавлен в корзину!`);
    updateCart();
}

function updateCart() {
    const cartItemsContainer = document.getElementById('cartItems');
    cartItemsContainer.innerHTML = '';
    cart.forEach(item => {
        const div = document.createElement('div');
        div.setAttribute('data-title', 'basket');
        div.setAttribute('data-price', 'basket');
        div.innerText = `${item.title} - ${item.price} рублей`;
        cartItemsContainer.appendChild(div);
    });
}

function resetFilters() {
    document.getElementById('minPrice').value = '';
    document.getElementById('maxPrice').value = '';
    document.getElementById('deliveryTime').value = '';
    const products = document.querySelectorAll('.product');
    products.forEach(product => {
        product.style.display = '';
    });
}

// Filter function (you can expand this further if needed)
function filterProducts() {
    const minPrice = parseFloat(document.getElementById('minPrice').value) || 0;
    const maxPrice = parseFloat(document.getElementById('maxPrice').value) || Infinity;
    const products = document.querySelectorAll('.product');

    products.forEach(product => {
        const price = parseFloat(product.getAttribute('data-price'));
        product.style.display = (price >= minPrice && price <= maxPrice) ? '' : 'none';
    });
}

// Call filterProducts on input change
document.getElementById('minPrice').addEventListener('input', filterProducts);
document.getElementById('maxPrice').addEventListener('input', filterProducts);