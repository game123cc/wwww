from flask import Flask, render_template, request, jsonify, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import os

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///splitwise.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    expenses = db.relationship('Expense', backref='payer', lazy=True)

class Expense(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    description = db.Column(db.String(200), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    payer_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    splits = db.relationship('ExpenseSplit', backref='expense', lazy=True)

class ExpenseSplit(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    expense_id = db.Column(db.Integer, db.ForeignKey('expense.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    is_settled = db.Column(db.Boolean, default=False)

# Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/users', methods=['GET', 'POST'])
def handle_users():
    if request.method == 'POST':
        data = request.json
        new_user = User(name=data['name'], email=data['email'])
        db.session.add(new_user)
        db.session.commit()
        return jsonify({"message": "User created successfully"}), 201
    users = User.query.all()
    return jsonify([{'id': u.id, 'name': u.name, 'email': u.email} for u in users])

@app.route('/api/expenses', methods=['GET', 'POST'])
def handle_expenses():
    if request.method == 'POST':
        data = request.json
        expense = Expense(
            description=data['description'],
            amount=data['amount'],
            payer_id=data['payer_id']
        )
        db.session.add(expense)
        db.session.flush()
        
        # Create splits
        for split in data['splits']:
            expense_split = ExpenseSplit(
                expense_id=expense.id,
                user_id=split['user_id'],
                amount=split['amount']
            )
            db.session.add(expense_split)
        
        db.session.commit()
        return jsonify({"message": "Expense added successfully"}), 201
    
    expenses = Expense.query.all()
    result = []
    for exp in expenses:
        result.append({
            'id': exp.id,
            'description': exp.description,
            'amount': exp.amount,
            'payer': exp.payer.name,
            'date': exp.date.isoformat(),
            'splits': [{'user_id': s.user_id, 'amount': s.amount, 'is_settled': s.is_settled} for s in exp.splits]
        })
    return jsonify(result)

@app.route('/api/balances')
def get_balances():
    users = User.query.all()
    balances = {}
    
    for user in users:
        balances[user.id] = {
            'name': user.name,
            'owes': 0,
            'owed': 0,
            'balance': 0
        }
    
    # Calculate who owes what
    expenses = Expense.query.all()
    for exp in expenses:
        for split in exp.splits:
            if split.user_id != exp.payer_id:
                # User owes money
                balances[split.user_id]['owes'] += split.amount
                # Payer is owed money
                balances[exp.payer_id]['owed'] += split.amount
    
    # Calculate final balance
    for user_id in balances:
        balances[user_id]['balance'] = balances[user_id]['owed'] - balances[user_id]['owes']
    
    return jsonify(balances)

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)
