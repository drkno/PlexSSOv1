import React, { Component } from 'react';
import { AlertList, Alert, AlertContainer } from 'react-bs-notifier';
import './App.css';

class App extends Component {
    state = {
        background: '',
        username: '',
        password: '',
        remember: false,
        alerts: [
            {
                id: (new Date()).getTime(),
                type: "danger",
                headline: `Whoa!`,
                message: "k"
            }
        ]
    };

    async componentWillMount() {
        const req = await fetch('/api/v1/background/');
        const data = await req.json();
        this.setState({
            background: data.url,
            username: localStorage.getItem('username') || '',
            password: localStorage.getItem('password') || ''
        });
    }

    async login() {
        if (this.state.remember) {
            localStorage.setItem('username', this.state.username);
            localStorage.setItem('password', this.state.password);
        }
        else if (localStorage.getItem('username') || localStorage.getItem('password')) {
            localStorage.removeItem('username');
            localStorage.removeItem('password');
        }

        try {
            const req = await fetch('/api/v1/login', {
                method: 'post',
                body: encodeURIComponent(`username=${this.state.username}&password=${this.state.password}`)
            });
            const data = await req.json();
            if (data.success) {
                this.loginSuccess(data);
            }
            else {
                this.loginFailure(data);
            }
        }
        catch(e) {
            this.loginFailure();
        }
    }

    loginSuccess(...data) {
        console.log('success');
        console.log(data);
    }

    loginFailure(data) {
        if (!data) {
            data = {
                success: false,
                error: 'An unknown error occurred.'
            };
        }
        
    }

    toggleRemember() {
        this.setState({
            remember: !this.state.remember
        });
    }

    render() {
        return (
            <div className="App" style={{backgroundImage: `linear-gradient(-10deg, transparent 20%, rgba(0, 0, 0, 0.7) 20%, rgba(0, 0, 0, 0.7) 80%, transparent 80%), url("${this.state.background}")`}}>
                <div className="card login-card">
                    <img className="card-img-top login-logo" src="/logo.png" alt="Logo" />
                    <input className="form-control login-input-field" type="text" placeholder="Username" autoFocus />
                    <input className="form-control login-input-field" type="password" placeholder="Password" />
                    <label className={`login-remember-me-checkbox-${this.state.remember ? '' : 'un'}checked login-remember-me-checkbox`} onClick={() => this.toggleRemember()}>Remember Me</label>
                    <br />
                    <button type="button" className="btn btn-success" onClick={() => this.login()}>Sign in</button>
                    <a href="https://www.plex.tv/sign-in/password-reset/" className="login-forgotten-link "><b>Forgot your password?</b></a>
                </div>
            </div>
        );
    }
}

export default App;
