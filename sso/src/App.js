import React, { Component } from 'react';
import { AlertList } from 'react-bs-notifier';
import './App.css';

class App extends Component {
    state = {
        background: '',
        username: '',
        password: '',
        remember: false,
        focus: 0,
        alerts: [],
        loggedIn: false,
        returnTo: ''
    };

    async componentWillMount() {
        const loggedInReq = await fetch('/api/v1/sso', {
            credentials: 'include'
        });
        loggedInReq.json().then(data => {
            this.setState({
                loggedIn: data.success,
                returnTo: (new URL(window.location.href)).searchParams.get('returnTo') || ''
            });
        });
        const username = localStorage.getItem('username');
        const password = localStorage.getItem('password');
        this.setState({
            username: username || '',
            password: password || '',
            remember: !!(username || password),
            focus: [username, password, null].indexOf(null)
        });
        const req = await fetch('/api/v1/background/');
        const data = await req.json();
        this.setState({
            background: data.url
        });
    }

    createAlert(message, type) {
        const prev = this.state.alerts[this.state.alerts.length - 1];
        const id = (prev && prev.id + 1) || 0;
        const alerts = this.state.alerts.slice();
        alerts.push({
            id: id,
            type: type,
            message: message
        });
        this.setState({
            alerts: alerts
        });
        setTimeout(() => {
            const otherAlerts = this.state.alerts.slice().filter(a => a.id !== id);
            this.setState({
                alerts: otherAlerts
            });
        }, 3000);
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
                body: `username=${encodeURIComponent(this.state.username)}&password=${encodeURIComponent(this.state.password)}`,
                headers: new Headers({'content-type': 'application/x-www-form-urlencoded'}),
                credentials: 'include'
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

    loginSuccess(data) {
        const username = data.data.user.username;
        const avatar = data.data.user.thumb;
        this.createAlert(
            (
                <img src={avatar} alt={`Login successful, welcome back ${username}.`} />
            ), 'success');
        this.setState({
            loggedIn: true
        });
        if (this.state.returnTo) {
            setTimeout(() => {
                window.location.href = this.state.returnTo;
            }, 1500);
        }
    }

    loginFailure(data) {
        if (!data || !data.data) {
            data = {
                success: false,
                data: 'An unknown error occurred.'
            };
        }
        this.createAlert(data.data, 'danger');
    }

    toggleRemember() {
        this.setState({
            remember: !this.state.remember
        });
    }

    onInputChange(field, event) {
        const change = {};
        change[field] = event.target.value;
        this.setState(change);
    }

    async logout() {
        const req = await fetch('/api/v1/logout', {
            credentials: 'include'
        });
        const data = await req.json();
        if (data.success) {
            this.setState({
                loggedIn: false
            });
            this.createAlert('Logout successful.', 'success');
        }
        else {
            this.createAlert('An unknown error occurred while logging out.', 'danger');
        }
    }

    render() {
        return (
            <div className="App"
                 style={{backgroundImage: `linear-gradient(-10deg, transparent 20%, rgba(0, 0, 0, 0.7) 20%, rgba(0, 0, 0, 0.7) 80%, transparent 80%), url("${this.state.background}")`}}>
                <AlertList alerts={this.state.alerts} />
                <div className="card login-card">
                    {this.state.loggedIn ? this.renderLogout() : this.renderLogin()}
                </div>
            </div>
        );
    }

    renderLogout() {
        return (
            <form id="logoutForm" onSubmit={e => e.preventDefault() && this.logout()} style={{textAlign: 'center'}}>
                <img className="card-img-top login-logo" src="/logo.png" alt="Logo" />
                <label className="logout-label">You already appear to be logged in.</label>
                <br />
                <button type="submit"
                        className="btn btn-danger"
                        onClick={() => this.logout()}
                        autoFocus>Logout</button>
            </form>
        );
    }

    renderLogin() {
        return (
            <form id="loginForm" onSubmit={e => e.preventDefault() && this.login()}>
                <img className="card-img-top login-logo" src="/logo.png" alt="Logo" />
                <input className="form-control login-input-field"
                       type="text"
                       placeholder="Username"
                       onChange={e => this.onInputChange('username', e)}
                       value={this.state.username}
                       autoFocus={this.state.focus === 0} />
                <input className="form-control login-input-field"
                       type="password" placeholder="Password"
                       onChange={e => this.onInputChange('password', e)}
                       value={this.state.password}
                       autoFocus={this.state.focus === 1} />
                <label className={`login-remember-me-checkbox-${this.state.remember ? '' : 'un'}checked login-remember-me-checkbox`}
                       onClick={() => this.toggleRemember()}>Remember Me</label>
                <br />
                <button type="submit"
                        className="btn btn-success"
                        onClick={() => this.login()}
                        autoFocus={this.state.focus === 2} >Sign in</button>
                <a href="https://www.plex.tv/sign-in/password-reset/"
                   className="login-forgotten-link "><b>Forgot your password?</b></a>
            </form>
        );
    }
}

export default App;
