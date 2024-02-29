import { deleteSync } from 'del';

export const clean = (done) => {
  deleteSync(app.isGitPages ? app.path.githubDocPagesFolder : app.path.buildFolder);

  return done();
}
