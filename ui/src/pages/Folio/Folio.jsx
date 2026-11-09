import React, { useState } from "react";

function Folio() {
  const [items, setItems] = useState([
    {
      id: 1,
      description: "Room Charge",
      amount: 5000,
    },
    {
      id: 2,
      description: "Food & Restaurant",
      amount: 1500,
    },
    {
      id: 3,
      description: "Room Service",
      amount: 500,
    },
  ]);

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");

  const addItem = () => {
    if (!description || !amount) {
      alert("Please enter description and amount");
      return;
    }

    const newItem = {
      id: Date.now(),
      description: description,
      amount: Number(amount),
    };

    setItems([...items, newItem]);
    setDescription("");
    setAmount("");
  };

  const removeItem = (id) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const subtotal = items.reduce(
    (total, item) => total + item.amount,
    0
  );

  return (
    <div className="folio-container">
      <h1>Guest Folio</h1>

      <p>
        <strong>Guest:</strong> Hotel Guest
      </p>

      <p>
        <strong>Room:</strong> 101
      </p>

      <hr />

      <h2>Folio Charges</h2>

      {items.map((item) => (
        <div key={item.id}>
          <p>
            {item.description} - ₹{item.amount}
            <button onClick={() => removeItem(item.id)}>
              Remove
            </button>
          </p>
        </div>
      ))}

      <hr />

      <h3>Subtotal: ₹{subtotal}</h3>

      <h2>Add New Charge</h2>

      <input
        type="text"
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <input
        type="number"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      <button onClick={addItem}>Add Charge</button>
    </div>
  );
}

export default Folio;